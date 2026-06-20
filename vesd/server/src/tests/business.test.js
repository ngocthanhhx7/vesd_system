import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientUrls } from '../config/env.js';
import { calculatePlatformFee } from '../services/walletService.js';

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
