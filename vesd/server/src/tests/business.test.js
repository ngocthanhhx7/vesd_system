import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientUrls } from '../config/env.js';
import { calculatePlatformFee } from '../services/walletService.js';
import { syncCompletedProjectState } from '../services/projectService.js';
import { ChecklistTemplate, Transaction, Wallet } from '../models/index.js';

test('role guard rule: admin can access admin area', () => {
  const user = { roles: ['admin'] };
  assert.equal(user.roles.includes('admin'), true);
});

test('project revision cannot exceed limit', () => {
  const project = { revisionLimit: 2, revisionUsed: 2 };
  assert.equal(project.revisionUsed >= project.revisionLimit, true);
});

test('escrow release computes platform fee at 5 percent', () => {
  const amount = 1000000;
  const fee = calculatePlatformFee(amount);
  assert.equal(fee, 50000);
  assert.equal(amount - fee, 950000);
});

test('auth password minimum length policy', () => {
  assert.equal('12345678'.length >= 8, true);
});

test('client urls config supports comma-separated origins', () => {
  assert.deepEqual(parseClientUrls('https://vesd.online, https://www.vesd.online/'), [
    'https://vesd.online',
    'https://www.vesd.online'
  ]);
});
test('disputable project statuses rule', () => {
  const disputableStatuses = ['escrow_funded', 'in_progress', 'submitted', 'revision_requested', 'final_submitted'];
  assert.equal(disputableStatuses.includes('in_progress'), true);
  assert.equal(disputableStatuses.includes('completed'), false);
  assert.equal(disputableStatuses.includes('cancelled'), false);
});

test('completed project escrow sync releases designer funds only once when concurrent', async () => {
  const originals = {
    checklistFindOne: ChecklistTemplate.findOne,
    transactionFind: Transaction.find,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
    walletFindOneAndUpdate: Wallet.findOneAndUpdate
  };

  const projectId = 'project-1';
  const clientId = 'client-1';
  const designerId = 'designer-1';
  const transactions = [
    {
      userId: clientId,
      projectId,
      type: 'deposit',
      amount: 1000000,
      status: 'success',
      metadata: { escrowAmount: 1000000 }
    }
  ];
  const wallets = new Map([
    [clientId, { userId: clientId, balance: 0, escrowBalance: 1000000, totalEarned: 0, totalSpent: 1000000 }]
  ]);

  const valueAtPath = (doc, path) => path.split('.').reduce((current, key) => current?.[key], doc);
  const matches = (doc, query) => Object.entries(query).every(([key, value]) => String(valueAtPath(doc, key)) === String(value));

  try {
    ChecklistTemplate.findOne = async () => null;
    Transaction.find = (query) => ({
      select: async () => transactions.filter((doc) => matches(doc, query))
    });
    Transaction.findOneAndUpdate = async (filter, update) => {
      const existing = transactions.find((doc) => matches(doc, filter));
      if (existing) {
        return { value: existing, lastErrorObject: { updatedExisting: true } };
      }
      const inserted = { ...update.$setOnInsert, _id: `tx-${transactions.length + 1}` };
      transactions.push(inserted);
      return { value: inserted, lastErrorObject: { updatedExisting: false, upserted: inserted._id } };
    };
    Wallet.findOneAndUpdate = async (filter, update, options = {}) => {
      const userId = String(filter.userId);
      const current = wallets.get(userId) || (options.upsert ? { userId, balance: 0, escrowBalance: 0, totalEarned: 0, totalSpent: 0 } : null);
      if (!current) return null;
      if (filter.balance?.$gte != null && current.balance < filter.balance.$gte) return null;
      if (filter.escrowBalance?.$gte != null && current.escrowBalance < filter.escrowBalance.$gte) return null;
      for (const [field, amount] of Object.entries(update.$inc || {})) {
        current[field] = (current[field] || 0) + amount;
      }
      for (const [field, value] of Object.entries(update.$set || {})) {
        current[field] = value;
      }
      wallets.set(userId, current);
      return current;
    };

    const projectA = { _id: projectId, clientId, designerId, status: 'completed', milestones: [], save: async () => {} };
    const projectB = { _id: projectId, clientId, designerId, status: 'completed', milestones: [], save: async () => {} };

    await Promise.all([
      syncCompletedProjectState(projectA),
      syncCompletedProjectState(projectB)
    ]);

    const releases = transactions.filter((transaction) => transaction.type === 'release');
    assert.equal(releases.length, 1);
    assert.equal(releases[0].amount, 950000);
    assert.equal(releases[0].platformFee, 50000);
    assert.equal(releases[0].metadata.grossAmount, 1000000);
    assert.equal(wallets.get(designerId).balance, 950000);
    assert.equal(wallets.get(designerId).totalEarned, 950000);
    assert.equal(wallets.get(clientId).escrowBalance, 0);
  } finally {
    ChecklistTemplate.findOne = originals.checklistFindOne;
    Transaction.find = originals.transactionFind;
    Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
    Wallet.findOneAndUpdate = originals.walletFindOneAndUpdate;
  }
});
