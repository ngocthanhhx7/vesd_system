import assert from 'node:assert/strict';
import test from 'node:test';
import {
  User as UserModel,
  ClientProfile as ClientProfileModel,
  DesignerProfile as DesignerProfileModel,
  Wallet as WalletModel
} from '../models/index.js';
import { buildDemoSeedData } from '../seed/demoSeedData.js';
import { seedDemoData } from '../seed/seed-demo-data.js';

function comparable(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function getPath(document, path) {
  return path.split('.').reduce((value, key) => value?.[key], document);
}

function matches(document, filter) {
  if (filter.$or) return filter.$or.some((entry) => matches(document, entry));
  return Object.entries(filter).every(([key, expected]) => {
    const actual = getPath(document, key);
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.some((candidate) => comparable(candidate) === comparable(actual));
    }
    return comparable(actual) === comparable(expected);
  });
}

function makeModel(initial = [], { failBulkWrite } = {}) {
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
      writes.push({ operations: structuredClone(operations), options: { ...options } });
      if (failBulkWrite) throw failBulkWrite;
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

function makeTransactionalSession(models) {
  return {
    ended: false,
    async withTransaction(work) {
      const snapshots = Object.values(models).map((model) => [
        model,
        structuredClone([...model.documents.entries()])
      ]);
      try {
        return await work();
      } catch (error) {
        for (const [model, entries] of snapshots) {
          model.documents.clear();
          entries.forEach(([key, value]) => model.documents.set(key, value));
        }
        throw error;
      }
    },
    async endSession() {
      this.ended = true;
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
    profiles: 24,
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

test('runner accepts Mongoose-normalized project defaults on a repeat run', async () => {
  const fixture = buildDemoSeedData();
  const normalizedProject = structuredClone(fixture.openProjects[0]);
  normalizedProject.agreement = { deliverables: [] };
  const dependencies = makeDependencies({ Project: makeModel([normalizedProject]) });

  await assert.doesNotReject(seedDemoData(dependencies));
  assert.equal(dependencies.models.Project.documents.size, 32);
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
  const { updatedAt, ...walletValues } = walletOperations[0].updateOne.update.$set;
  const { createdAt } = walletOperations[0].updateOne.update.$setOnInsert;
  assert.ok(createdAt);
  assert.ok(updatedAt);
  assert.deepEqual(walletValues, {
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

test('runner uses injected connection lifecycle and logger', async () => {
  const dependencies = makeDependencies();
  const events = [];
  Object.assign(dependencies, {
    connect: async () => events.push('connect'),
    disconnect: async () => events.push('disconnect'),
    log: (...args) => events.push(['log', ...args])
  });

  const summary = await seedDemoData(dependencies);

  assert.equal(events[0], 'connect');
  assert.deepEqual(events.at(-2), ['log', 'Demo seed completed:', summary.counts]);
  assert.equal(events.at(-1), 'disconnect');
});

test('runner always calls injected disconnect when seeding fails', async () => {
  const fixture = buildDemoSeedData();
  const dependencies = makeDependencies({
    Project: makeModel([{ _id: fixture.projects[0]._id, clientId: fixture.projects[0].clientId, title: 'Unrelated project' }])
  });
  const events = [];
  Object.assign(dependencies, {
    connect: async () => events.push('connect'),
    disconnect: async () => events.push('disconnect'),
    log: (...args) => events.push(['log', ...args])
  });

  await assert.rejects(seedDemoData(dependencies), /Project.+collision/i);

  assert.deepEqual(events, ['connect', 'disconnect']);
});

test('runner passes one session to every write and commits them atomically', async () => {
  const dependencies = makeDependencies();
  const session = makeTransactionalSession(dependencies.models);
  dependencies.startSession = async () => session;

  await seedDemoData(dependencies);

  for (const model of Object.values(dependencies.models)) {
    assert.ok(model.writes.every(({ options }) => options.session === session));
  }
  assert.equal(session.ended, true);
});

test('transaction rolls back earlier batches when a later write fails', async () => {
  const writeError = new Error('project batch failed');
  const dependencies = makeDependencies({ Project: makeModel([], { failBulkWrite: writeError }) });
  const session = makeTransactionalSession(dependencies.models);
  dependencies.startSession = async () => session;

  await assert.rejects(seedDemoData(dependencies), writeError);

  assert.ok(Object.values(dependencies.models).every((model) => model.documents.size === 0));
  assert.equal(session.ended, true);
});

test('runner only falls back without a transaction for a recognized unsupported deployment', async () => {
  const dependencies = makeDependencies();
  const unsupported = Object.assign(new Error('Transaction numbers are only allowed on a replica set member or mongos'), { code: 20 });
  let attempts = 0;
  dependencies.startSession = async () => ({
    async withTransaction() {
      attempts += 1;
      throw unsupported;
    },
    async endSession() {}
  });

  await seedDemoData(dependencies);

  assert.equal(attempts, 1);
  assert.equal(dependencies.models.User.documents.size, 24);
  assert.ok(Object.values(dependencies.models).every((model) => (
    model.writes.every(({ options }) => !Object.hasOwn(options, 'session'))
  )));
});

test('runner falls back when session startup reports a recognized unsupported deployment', async () => {
  const dependencies = makeDependencies();
  const unsupported = Object.assign(new Error('Transaction numbers are only allowed on a replica set member or mongos'), { code: 20 });
  dependencies.startSession = async () => { throw unsupported; };

  await seedDemoData(dependencies);

  assert.equal(dependencies.models.User.documents.size, 24);
  assert.ok(Object.values(dependencies.models).every((model) => (
    model.writes.every(({ options }) => !Object.hasOwn(options, 'session'))
  )));
});

test('runner propagates unrecognized transaction errors without a non-transaction retry', async () => {
  const dependencies = makeDependencies();
  const transactionError = new Error('network interrupted');
  dependencies.startSession = async () => ({
    async withTransaction() {
      throw transactionError;
    },
    async endSession() {}
  });

  await assert.rejects(seedDemoData(dependencies), transactionError);

  assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
});

test('preflight rejects every modeled unique-key collision before any write', async () => {
  const fixture = buildDemoSeedData();
  const release = fixture.releases[0];
  const cases = [
    ['ClientProfile', { _id: '100000000000000000000001', userId: fixture.clientProfiles[0].userId }],
    ['DesignerProfile', { _id: '100000000000000000000002', userId: fixture.designerProfiles[0].userId, slug: 'different-slug' }],
    ['DesignerProfile', { _id: '100000000000000000000003', userId: '200000000000000000000003', slug: fixture.designerProfiles[0].slug }],
    ['Wallet', { _id: '100000000000000000000004', userId: fixture.wallets[0].userId }],
    ['Transaction', {
      _id: '100000000000000000000005',
      userId: release.userId,
      projectId: release.projectId,
      type: 'release',
      amount: release.amount,
      platformFee: release.platformFee,
      status: release.status,
      metadata: { ...release.metadata }
    }]
  ];

  for (const [modelName, conflictingDocument] of cases) {
    const dependencies = makeDependencies({ [modelName]: makeModel([conflictingDocument]) });
    await assert.rejects(seedDemoData(dependencies), /collision/i, modelName);
    assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
  }
});

test('preflight rejects same-id records when any immutable identity field differs', async () => {
  const fixture = buildDemoSeedData();
  const cases = [
    ['User', fixture.users[0], (item) => { item.name = 'Different name'; }],
    ['User', fixture.users[0], (item) => { item.email = 'different@example.com'; }],
    ['User', fixture.users[0], (item) => { item.roles = ['designer']; }],
    ['User', fixture.users[0], (item) => { item.status = 'banned'; }],
    ['ClientProfile', fixture.clientProfiles[0], (item) => { item.userId = fixture.clients[1]._id; }],
    ['DesignerProfile', fixture.designerProfiles[0], (item) => { item.userId = fixture.designers[1]._id; }],
    ['DesignerProfile', fixture.designerProfiles[0], (item) => { item.slug = 'different-slug'; }],
    ['Project', fixture.completedProjects[0], (item) => { item.clientId = fixture.clients[1]._id; }],
    ['Project', fixture.completedProjects[0], (item) => { item.designerId = fixture.designers[1]._id; }],
    ['Project', fixture.completedProjects[0], (item) => { item.title = 'Different project'; }],
    ['Project', fixture.completedProjects[0], (item) => { item.status = 'in_progress'; }],
    ['Project', fixture.completedProjects[0], (item) => { item.budget.agreed += 1; }],
    ['Project', fixture.completedProjects[0], (item) => { item.agreement.price += 1; }],
    ['Transaction', fixture.releases[0], (item) => { item.userId = fixture.designers[1]._id; }],
    ['Transaction', fixture.releases[0], (item) => { item.projectId = fixture.completedProjects[1]._id; }],
    ['Transaction', fixture.releases[0], (item) => { item.type = 'deposit'; }],
    ['Transaction', fixture.releases[0], (item) => { item.amount += 1; }],
    ['Transaction', fixture.releases[0], (item) => { item.platformFee += 1; }],
    ['Transaction', fixture.releases[0], (item) => { item.status = 'pending'; }],
    ['Transaction', fixture.releases[0], (item) => { item.metadata.releaseKey = 'different-release'; }],
    ['Transaction', fixture.releases[0], (item) => { item.metadata.grossAmount += 1; }],
    ['Transaction', fixture.deposits[0], (item) => { item.metadata.escrowAmount += 1; }]
  ];

  for (const [modelName, source, mutate] of cases) {
    const existing = structuredClone(source);
    mutate(existing);
    const dependencies = makeDependencies({ [modelName]: makeModel([existing]) });
    await assert.rejects(seedDemoData(dependencies), new RegExp(`${modelName}.+collision`, 'i'), modelName);
    assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
  }
});

test('runner validates approved fixture counts and money invariants before hashing or writing', async () => {
  const cases = [
    (fixture) => { fixture.clients.pop(); },
    (fixture) => { fixture.designers.pop(); },
    (fixture) => { fixture.completedProjects.pop(); },
    (fixture) => { fixture.openProjects.pop(); },
    (fixture) => { fixture.users[12].roles = ['client']; },
    (fixture) => { fixture.completedProjects[0].status = 'in_progress'; },
    (fixture) => { fixture.openProjects[0].status = 'draft'; },
    (fixture) => { fixture.openProjects[0].designerId = fixture.designers[0]._id; },
    (fixture) => { fixture.completedProjects[0].grossAmount += 1; },
    (fixture) => { fixture.releases[0].platformFee += 1; },
    (fixture) => { fixture.releases[0].amount += 1; }
  ];

  for (const mutate of cases) {
    const invalidFixture = buildDemoSeedData();
    mutate(invalidFixture);
    const dependencies = makeDependencies();
    dependencies.buildFixture = () => invalidFixture;

    await assert.rejects(seedDemoData(dependencies), /fixture invariant/i);
    assert.equal(dependencies.hashCalls.length, 0);
    assert.ok(Object.values(dependencies.models).every((model) => model.writes.length === 0));
  }
});

test('timestamp-disabled user profile and wallet upserts contain dates that Mongoose preserves', async () => {
  const dependencies = makeDependencies();
  await seedDemoData(dependencies);

  const operationSets = [
    ['User', UserModel, '$setOnInsert', '$setOnInsert'],
    ['ClientProfile', ClientProfileModel, '$setOnInsert', '$setOnInsert'],
    ['DesignerProfile', DesignerProfileModel, '$setOnInsert', '$setOnInsert'],
    ['Wallet', WalletModel, '$setOnInsert', '$set']
  ];

  for (const [name, model, createdAtOperator, updatedAtOperator] of operationSets) {
    const operations = dependencies.models[name].writes[0].operations;
    for (const { updateOne } of operations) {
      assert.ok(updateOne.update[createdAtOperator].createdAt, `${name} createdAt`);
      assert.ok(updateOne.update[updatedAtOperator].updatedAt, `${name} updatedAt`);
    }

    const originalBulkWrite = model.collection.bulkWrite;
    let castOperations;
    model.collection.bulkWrite = async (items) => {
      castOperations = items;
      return { acknowledged: true, upsertedCount: items.length };
    };
    try {
      await model.bulkWrite([operations[0]]);
    } finally {
      model.collection.bulkWrite = originalBulkWrite;
    }
    assert.ok(castOperations[0].updateOne.update[createdAtOperator].createdAt instanceof Date, `${name} casts createdAt`);
    assert.ok(castOperations[0].updateOne.update[updatedAtOperator].updatedAt instanceof Date, `${name} casts updatedAt`);
  }
});
