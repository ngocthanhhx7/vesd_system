import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import {
  User,
  ClientProfile,
  DesignerProfile,
  Wallet,
  Project,
  Transaction
} from '../models/index.js';
import { buildDemoSeedData } from './demoSeedData.js';

const DEFAULT_MODELS = {
  User,
  ClientProfile,
  DesignerProfile,
  Wallet,
  Project,
  Transaction
};
const DEMO_RECORD_TIMESTAMP = '2026-06-29T08:00:00.000Z';

function sameValue(left, right) {
  return String(left) === String(right);
}

function getPath(document, path) {
  return path.split('.').reduce((value, key) => value?.[key], document);
}

function normalized(value) {
  if (value instanceof Date) return value.toISOString();
  if (value?._bsontype === 'ObjectId' || value?.constructor?.name === 'ObjectId') return String(value);
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
  }
  return value;
}

function sameFields(left, right, fields) {
  return fields.every((field) => (
    JSON.stringify(normalized(getPath(left, field))) === JSON.stringify(normalized(getPath(right, field)))
  ));
}

function collisionSpecs(models, fixture) {
  return [
    {
      name: 'User',
      model: models.User,
      fixtures: fixture.users,
      identityFields: ['name', 'email', 'roles', 'status'],
      uniqueKeys: [{ label: 'email', fields: ['email'], fixtures: fixture.users }]
    },
    {
      name: 'ClientProfile',
      model: models.ClientProfile,
      fixtures: fixture.clientProfiles,
      identityFields: ['userId'],
      uniqueKeys: [{ label: 'userId', fields: ['userId'], fixtures: fixture.clientProfiles }]
    },
    {
      name: 'DesignerProfile',
      model: models.DesignerProfile,
      fixtures: fixture.designerProfiles,
      identityFields: ['userId', 'slug'],
      uniqueKeys: [
        { label: 'userId', fields: ['userId'], fixtures: fixture.designerProfiles },
        { label: 'slug', fields: ['slug'], fixtures: fixture.designerProfiles }
      ]
    },
    {
      name: 'Wallet',
      model: models.Wallet,
      fixtures: fixture.wallets,
      identityFields: ['userId'],
      uniqueKeys: [{ label: 'userId', fields: ['userId'], fixtures: fixture.wallets }]
    },
    {
      name: 'Project',
      model: models.Project,
      fixtures: fixture.projects,
      identityFields: ['clientId', 'designerId', 'title', 'status', 'budget', 'agreement'],
      uniqueKeys: []
    },
    {
      name: 'Transaction',
      model: models.Transaction,
      fixtures: fixture.transactions,
      identityFields: [
        'userId', 'projectId', 'type', 'amount', 'platformFee', 'status',
        'metadata.releaseKey', 'metadata.grossAmount', 'metadata.escrowAmount'
      ],
      uniqueKeys: [{
        label: 'release tuple',
        fields: ['projectId', 'type', 'metadata.releaseKey'],
        fixtures: fixture.releases
      }]
    }
  ];
}

async function preflightCollisions(models, fixture) {
  for (const spec of collisionSpecs(models, fixture)) {
    const uniqueFilters = spec.uniqueKeys.flatMap((key) => key.fixtures.map((item) => (
      Object.fromEntries(key.fields.map((field) => [field, getPath(item, field)]))
    )));
    const filter = {
      $or: [
        { _id: { $in: spec.fixtures.map(({ _id }) => _id) } },
        ...uniqueFilters
      ]
    };
    const existingDocuments = await spec.model.find(filter).lean();
    const fixturesById = new Map(spec.fixtures.map((item) => [String(item._id), item]));

    for (const existing of existingDocuments) {
      const expectedById = fixturesById.get(String(existing._id));
      if (expectedById && !sameFields(existing, expectedById, spec.identityFields)) {
        throw new Error(`${spec.name} _id collision: ${existing._id}`);
      }

      for (const uniqueKey of spec.uniqueKeys) {
        const expectedByUniqueKey = uniqueKey.fixtures.find((item) => (
          sameFields(existing, item, uniqueKey.fields)
        ));
        if (expectedByUniqueKey && !sameValue(existing._id, expectedByUniqueKey._id)) {
          throw new Error(`${spec.name} ${uniqueKey.label} collision: ${existing._id}`);
        }
      }
    }
  }
}

function insertOnlyOperations(fixtures) {
  return fixtures.map((document) => ({
    updateOne: {
      filter: { _id: document._id },
      update: { $setOnInsert: document },
      upsert: true,
      timestamps: false
    }
  }));
}

function walletOperations(wallets) {
  return wallets.map(({ _id, createdAt, ...values }) => ({
    updateOne: {
      filter: { _id },
      update: {
        $set: values,
        $setOnInsert: { _id, createdAt }
      },
      upsert: true,
      timestamps: false
    }
  }));
}

function withRecordTimestamps(documents) {
  return documents.map((document) => ({
    ...document,
    createdAt: document.createdAt || DEMO_RECORD_TIMESTAMP,
    updatedAt: document.updatedAt || DEMO_RECORD_TIMESTAMP
  }));
}

async function writeFixture(model, operations, session) {
  if (operations.length === 0) return;
  await model.bulkWrite(operations, {
    ordered: true,
    ...(session ? { session } : {})
  });
}

function transactionUnsupported(error) {
  return error?.code === 20
    && /transaction numbers are only allowed on a replica set member or mongos/i.test(error.message || '');
}

function validateFixture(fixture) {
  const invariant = (condition, message) => {
    if (!condition) throw new Error(`Fixture invariant failed: ${message}`);
  };
  invariant(fixture.clients.length === 12, 'expected 12 client accounts');
  invariant(fixture.designers.length === 12, 'expected 12 designer accounts');
  invariant(fixture.users.length === 24, 'expected 24 total accounts');
  invariant(
    fixture.users.filter((user) => user.roles.length === 1 && user.roles[0] === 'client').length === 12,
    'expected 12 client-role accounts'
  );
  invariant(
    fixture.users.filter((user) => user.roles.length === 1 && user.roles[0] === 'designer').length === 12,
    'expected 12 designer-role accounts'
  );
  invariant(
    fixture.completedProjects.length === 12
      && fixture.completedProjects.every((project) => project.status === 'completed'),
    'expected 12 completed projects'
  );
  invariant(
    fixture.openProjects.length === 20
      && fixture.openProjects.every((project) => (
        project.status === 'pending_designer' && project.designerId == null
      )),
    'expected 20 open projects'
  );
  invariant(
    fixture.completedProjects.reduce((sum, project) => sum + project.grossAmount, 0) === 8_000_000,
    'expected 8,000,000 gross revenue'
  );
  invariant(
    fixture.releases.reduce((sum, transaction) => sum + transaction.platformFee, 0) === 400_000,
    'expected 400,000 platform fee'
  );
  invariant(
    fixture.releases.reduce((sum, transaction) => sum + transaction.amount, 0) === 7_600_000,
    'expected 7,600,000 designer net revenue'
  );
}

export async function seedDemoData({
  models = DEFAULT_MODELS,
  connect = async () => {},
  disconnect = async () => {},
  startSession,
  hashPassword = bcrypt.hash,
  log = () => {},
  buildFixture = buildDemoSeedData
} = {}) {
  try {
    await connect();
    const fixture = buildFixture();
    validateFixture(fixture);
    await preflightCollisions(models, fixture);

    const passwordHash = await hashPassword(fixture.password, 12);
    const users = withRecordTimestamps(fixture.users.map((user) => ({ ...user, passwordHash })));
    const clientProfiles = withRecordTimestamps(fixture.clientProfiles);
    const designerProfiles = withRecordTimestamps(fixture.designerProfiles);
    const wallets = withRecordTimestamps(fixture.wallets);
    const projects = fixture.projects.map(({ grossAmount: _grossAmount, ...project }) => project);

    const writeAll = async (session) => {
      await writeFixture(models.User, insertOnlyOperations(users), session);
      await writeFixture(models.ClientProfile, insertOnlyOperations(clientProfiles), session);
      await writeFixture(models.DesignerProfile, insertOnlyOperations(designerProfiles), session);
      await writeFixture(models.Project, insertOnlyOperations(projects), session);
      await writeFixture(models.Transaction, insertOnlyOperations(fixture.transactions), session);
      await writeFixture(models.Wallet, walletOperations(wallets), session);
    };

    if (startSession) {
      let session;
      try {
        session = await startSession();
        await session.withTransaction(() => writeAll(session));
      } catch (error) {
        if (!transactionUnsupported(error)) throw error;
        await writeAll();
      } finally {
        if (session) await session.endSession();
      }
    } else {
      await writeAll();
    }

    const summary = {
      counts: {
        users: fixture.users.length,
        profiles: fixture.profiles.length,
        clientProfiles: fixture.clientProfiles.length,
        designerProfiles: fixture.designerProfiles.length,
        wallets: fixture.wallets.length,
        projects: fixture.projects.length,
        transactions: fixture.transactions.length
      }
    };
    log('Demo seed completed:', summary.counts);
    return summary;
  } finally {
    await disconnect();
  }
}

async function runDirectly() {
  return seedDemoData({
    connect: connectDb,
    disconnect: () => mongoose.disconnect(),
    startSession: () => mongoose.startSession(),
    log: console.log
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDirectly().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
