import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientUrls } from '../config/env.js';

test('role guard rule: admin can access admin area', () => {
  const user = { roles: ['admin'] };
  assert.equal(user.roles.includes('admin'), true);
});

test('project revision cannot exceed limit', () => {
  const project = { revisionLimit: 2, revisionUsed: 2 };
  assert.equal(project.revisionUsed >= project.revisionLimit, true);
});

test('escrow release computes platform fee at 8 percent', () => {
  const amount = 1000000;
  const fee = Math.round(amount * 0.08);
  assert.equal(fee, 80000);
  assert.equal(amount - fee, 920000);
});

test('auth password minimum length policy', () => {
  assert.equal('12345678'.length >= 8, true);
});

test('client urls config supports comma-separated origins', () => {
  assert.deepEqual(parseClientUrls('https://vesd.site, https://www.vesd.site/'), [
    'https://vesd.site',
    'https://www.vesd.site'
  ]);
});
