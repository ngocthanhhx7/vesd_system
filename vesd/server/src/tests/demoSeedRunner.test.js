import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoSeedData } from '../seed/demoSeedData.js';
import { seedDemoData } from '../seed/seed-demo-data.js';

function comparable(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function matches(document, filter) {
  if (filter.$or) return filter.$or.some((entry) => matches(document, entry));
  return Object.entries(filter).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.some((candidate) => comparable(candidate) === comparable(actual));
    }
    return comparable(actual) === comparable(expected);
  });
}

function makeModel(initial = []) {
  const documents = new Map(initial.map((document) => [comparable(document._id), structuredClone(document)]));
  const writes = [];
  return {
    documents,
    writes,
    find(filter) {
      const result = [...documents.values()].filter((document) => matches(document, filter));
      return { lean: async () => structuredClone(result) };
    },
    async bulkWrite(operations, options) {
      writes.push({ operations: structuredClone(operations), options: structuredClone(options) });
      let upsertedCount = 0;
      let modifiedCount = 0;
      for (const { updateOne } of operations) {
        const key = comparable(updateOne.filter._id);
        const existing = documents.get(key);
        if (existing) {
          if (updateOne.update.$set) {
            Object.assign(existing, structuredClone(updateOne.update.$set));
            modifiedCount += 1;
          }
          continue;
        }
        documents.set(key, structuredClone({
          ...updateOne.update.$setOnInsert,
          ...updateOne.update.$set
        }));
        upsertedCount += 1;
      }
      return { upsertedCount, modifiedCount };
    }
  };
}

function makeDependencies(overrides = {}) {
  const models = {
    User: makeModel(),
    ClientProfile: makeModel(),
    DesignerProfile: makeModel(),
    Wallet: makeModel(),
    Project: makeModel(),
    Transaction: makeModel(),
    ...overrides
  };
  const hashCalls = [];
  return {
    models,
    hashCalls,
    hashPassword: async (...args) => {
      hashCalls.push(args);
      return 'hashed-password';
    }
  };
}

test('runner inserts the additive fixture once and remains idempotent on a second run', async () => {
  const dependencies = makeDependencies();

  const first = await seedDemoData(dependencies);
  const firstBalances = [...dependencies.models.Wallet.documents.values()].map(({ balance }) => balance);
  const second = await seedDemoData(dependencies);

  assert.deepEqual(first.counts, {
    users: 24,
    clientProfiles: 12,
    designerProfiles: 12,
    wallets: 24,
    projects: 32,
    transactions: 24
  });
  assert.deepEqual(second.counts, first.counts);
  assert.equal(dependencies.models.User.documents.size, 24);
  assert.equal(dependencies.models.ClientProfile.documents.size, 12);
  assert.equal(dependencies.models.DesignerProfile.documents.size, 12);
  assert.equal(dependencies.models.Wallet.documents.size, 24);
  assert.equal(dependencies.models.Project.documents.size, 32);
  assert.equal(dependencies.models.Transaction.documents.size, 24);
  assert.deepEqual(
    [...dependencies.models.Wallet.documents.values()].map(({ balance }) => balance),
    firstBalances
  );
  assert.deepEqual(dependencies.hashCalls, [
    ['12345678', 12],
    ['12345678', 12]
  ]);
});

test('runner rejects every collision during preflight before hashing or writing', async () => {
  const fixture = buildDemoSeedData();
  const conflictingUser = {
    _id: 'ffffffffffffffffffffffff',
    email: fixture.users[0].email
  };
  const dependencies = makeDependencies({ User: makeModel([conflictingUser]) });

  await assert.rejects(
    seedDemoData(dependencies),
    /email.+already belongs|collision/i
  );

  assert.equal(dependencies.hashCalls.length, 0);
  assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
});

test('runner rejects a deterministic id occupied by unrelated data before any write', async () => {
  const fixture = buildDemoSeedData();
  const dependencies = makeDependencies({
    Project: makeModel([{ _id: fixture.projects[0]._id, clientId: fixture.projects[0].clientId, title: 'Unrelated project' }])
  });

  await assert.rejects(seedDemoData(dependencies), /Project.+collision/i);

  assert.equal(dependencies.hashCalls.length, 0);
  assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
});

test('non-wallet fixtures only use setOnInsert while wallets use absolute set values', async () => {
  const dependencies = makeDependencies();
  const fixture = buildDemoSeedData();

  await seedDemoData(dependencies);

  for (const name of ['User', 'ClientProfile', 'DesignerProfile', 'Project', 'Transaction']) {
    const operations = dependencies.models[name].writes[0].operations;
    assert.ok(operations.every(({ updateOne }) => updateOne.update.$setOnInsert));
    assert.ok(operations.every(({ updateOne }) => !updateOne.update.$set));
    assert.ok(operations.every(({ updateOne }) => updateOne.upsert === true && updateOne.timestamps === false));
  }
  const walletOperations = dependencies.models.Wallet.writes[0].operations;
  assert.ok(walletOperations.every(({ updateOne }) => updateOne.update.$set));
  assert.ok(walletOperations.every(({ updateOne }) => !Object.hasOwn(updateOne.update.$set, '_id')));
  assert.deepEqual(walletOperations[0].updateOne.update.$set, {
    userId: fixture.wallets[0].userId,
    balance: fixture.wallets[0].balance,
    pendingBalance: fixture.wallets[0].pendingBalance,
    escrowBalance: fixture.wallets[0].escrowBalance,
    totalEarned: fixture.wallets[0].totalEarned,
    totalSpent: fixture.wallets[0].totalSpent
  });
});

test('transaction upserts preserve the fixture createdAt backdate', async () => {
  const dependencies = makeDependencies();
  const fixture = buildDemoSeedData();

  await seedDemoData(dependencies);

  const operations = dependencies.models.Transaction.writes[0].operations;
  assert.deepEqual(
    operations.map(({ updateOne }) => updateOne.update.$setOnInsert.createdAt),
    fixture.transactions.map(({ createdAt }) => createdAt)
  );
});
