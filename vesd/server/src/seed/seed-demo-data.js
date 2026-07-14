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

function sameValue(left, right) {
  return String(left) === String(right);
}

function collisionSpecs(models, fixture) {
  return [
    {
      name: 'User',
      model: models.User,
      fixtures: fixture.users,
      filter: {
        $or: [
          { _id: { $in: fixture.users.map(({ _id }) => _id) } },
          { email: { $in: fixture.users.map(({ email }) => email) } }
        ]
      },
      matchesIdentity: (existing, expected) => existing.email === expected.email
    },
    {
      name: 'ClientProfile',
      model: models.ClientProfile,
      fixtures: fixture.clientProfiles,
      matchesIdentity: (existing, expected) => sameValue(existing.userId, expected.userId)
    },
    {
      name: 'DesignerProfile',
      model: models.DesignerProfile,
      fixtures: fixture.designerProfiles,
      matchesIdentity: (existing, expected) => sameValue(existing.userId, expected.userId)
    },
    {
      name: 'Wallet',
      model: models.Wallet,
      fixtures: fixture.wallets,
      matchesIdentity: (existing, expected) => sameValue(existing.userId, expected.userId)
    },
    {
      name: 'Project',
      model: models.Project,
      fixtures: fixture.projects,
      matchesIdentity: (existing, expected) => (
        sameValue(existing.clientId, expected.clientId) && existing.title === expected.title
      )
    },
    {
      name: 'Transaction',
      model: models.Transaction,
      fixtures: fixture.transactions,
      matchesIdentity: (existing, expected) => (
        sameValue(existing.userId, expected.userId)
        && sameValue(existing.projectId, expected.projectId)
        && existing.type === expected.type
      )
    }
  ];
}

async function preflightCollisions(models, fixture) {
  for (const spec of collisionSpecs(models, fixture)) {
    const filter = spec.filter || { _id: { $in: spec.fixtures.map(({ _id }) => _id) } };
    const existingDocuments = await spec.model.find(filter).lean();
    const fixturesById = new Map(spec.fixtures.map((item) => [String(item._id), item]));

    for (const existing of existingDocuments) {
      const expectedById = fixturesById.get(String(existing._id));
      if (expectedById && !spec.matchesIdentity(existing, expectedById)) {
        throw new Error(`${spec.name} _id collision: ${existing._id}`);
      }
      if (spec.name === 'User') {
        const expectedByEmail = spec.fixtures.find(({ email }) => email === existing.email);
        if (expectedByEmail && !sameValue(existing._id, expectedByEmail._id)) {
          throw new Error(`User email ${existing.email} already belongs to another account`);
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
  return wallets.map(({ _id, ...values }) => ({
    updateOne: {
      filter: { _id },
      update: {
        $set: values,
        $setOnInsert: { _id }
      },
      upsert: true,
      timestamps: false
    }
  }));
}

async function writeFixture(model, operations) {
  if (operations.length === 0) return;
  await model.bulkWrite(operations, { ordered: true });
}

export async function seedDemoData({
  models = DEFAULT_MODELS,
  connect = async () => {},
  disconnect = async () => {},
  hashPassword = bcrypt.hash,
  log = () => {},
  buildFixture = buildDemoSeedData
} = {}) {
  try {
    await connect();
    const fixture = buildFixture();
    await preflightCollisions(models, fixture);

    const passwordHash = await hashPassword(fixture.password, 12);
    const users = fixture.users.map((user) => ({ ...user, passwordHash }));
    const projects = fixture.projects.map(({ grossAmount: _grossAmount, ...project }) => project);

    await writeFixture(models.User, insertOnlyOperations(users));
    await writeFixture(models.ClientProfile, insertOnlyOperations(fixture.clientProfiles));
    await writeFixture(models.DesignerProfile, insertOnlyOperations(fixture.designerProfiles));
    await writeFixture(models.Project, insertOnlyOperations(projects));
    await writeFixture(models.Transaction, insertOnlyOperations(fixture.transactions));
    await writeFixture(models.Wallet, walletOperations(fixture.wallets));

    const summary = {
      counts: {
        users: fixture.users.length,
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
    log: console.log
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDirectly().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
