# VESD Direct Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the current VESD MongoDB additively with 24 login accounts, 12 completed projects totaling VND 8,000,000 gross revenue, and 20 open jobs, while preserving every existing record.

**Architecture:** A pure fixture module owns deterministic identities, project values, dates, and IDs. A separate idempotent seed runner performs collision preflight, insert-only upserts, and absolute wallet synchronization; a focused revenue service aggregates successful release gross amounts separately from platform fees.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, bcryptjs, React 18, TypeScript, Vitest, Node test runner.

---

## File Map

- Create `vesd/server/src/seed/demoSeedData.js`: deterministic account/project/transaction fixture builder.
- Create `vesd/server/src/tests/demoSeedData.test.js`: fixture invariants.
- Create `vesd/server/src/seed/seed-demo-data.js`: collision-safe idempotent database writer.
- Create `vesd/server/src/tests/demoSeedRunner.test.js`: runner idempotency and collision tests using injected repositories.
- Create `vesd/server/src/services/revenueService.js`: release-only gross revenue and platform fee aggregation.
- Create `vesd/server/src/tests/revenueService.test.js`: aggregation behavior.
- Modify `vesd/server/src/routes/main.routes.js`: use the revenue service in admin summary.
- Modify `vesd/server/package.json`: add `seed:demo` and a targeted test script.
- Modify `vesd/client/src/pages/dashboard/shared/Metric.tsx`: optional metric description.
- Modify `vesd/client/src/pages/dashboard/AdminPages.tsx`: show gross revenue and platform fee distinctly.
- Modify `vesd/client/src/pages/DashboardPages.test.tsx`: rendering contract for the metric description.
- Modify `vesd/README.md`: document the additive seed command and account split.

### Task 1: Deterministic seed fixtures

**Files:**
- Create: `vesd/server/src/tests/demoSeedData.test.js`
- Create: `vesd/server/src/seed/demoSeedData.js`

- [ ] **Step 1: Write failing fixture tests**

Test exact invariants: 12 clients, 12 designers, 12 completed projects, 20 open projects, password `12345678`, exact provided emails, unique deterministic 24-character hex IDs, gross values
`[500000,600000,700000,800000,550000,650000,750000,850000,450000,500000,800000,850000]`, total gross `8000000`, total fee `400000`, total designer net `7600000`, and transaction dates within `2026-06-30T00:00:00.000Z`–`2026-07-14T23:59:59.999Z`.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoSeedData } from '../seed/demoSeedData.js';

test('demo seed fixtures satisfy approved counts and money totals', () => {
  const data = buildDemoSeedData();
  assert.equal(data.clients.length, 12);
  assert.equal(data.designers.length, 12);
  assert.equal(data.completedProjects.length, 12);
  assert.equal(data.openProjects.length, 20);
  assert.equal(data.completedProjects.reduce((sum, item) => sum + item.grossAmount, 0), 8_000_000);
  assert.equal(data.releases.reduce((sum, item) => sum + item.platformFee, 0), 400_000);
  assert.equal(data.releases.reduce((sum, item) => sum + item.amount, 0), 7_600_000);
});

test('accounts use the approved identities and roles', () => {
  const data = buildDemoSeedData();
  assert.equal(data.password, '12345678');
  assert.equal(data.clients[0].email, 'linh.nguyen1998@gmail.com');
  assert.equal(data.clients.at(-1).email, 'anh.thu1998@gmail.com');
  assert.equal(data.designers[0].email, 'phuong.le2000@gmail.com');
  assert.equal(data.designers.at(-1).email, 'nhu.y2001@gmail.com');
  assert.ok(data.clients.every((item) => item.roles.includes('client')));
  assert.ok(data.designers.every((item) => item.roles.includes('designer')));
});

test('open jobs are unassigned and completed transaction dates are bounded', () => {
  const data = buildDemoSeedData();
  assert.ok(data.openProjects.every((item) => item.status === 'pending_designer' && item.designerId == null));
  const from = Date.parse('2026-06-30T00:00:00.000Z');
  const through = Date.parse('2026-07-14T23:59:59.999Z');
  assert.ok(data.releases.every((item) => Date.parse(item.createdAt) >= from && Date.parse(item.createdAt) <= through));
});
```

- [ ] **Step 2: Run RED**

Run: `node --test src/tests/demoSeedData.test.js` from `vesd/server`.
Expected: FAIL because `demoSeedData.js` does not exist.

- [ ] **Step 3: Implement fixture builder**

Use `crypto.createHash('sha256').update('vesd-demo-2026:' + key).digest('hex').slice(0, 24)` for deterministic IDs. Copy the 24 approved names/emails exactly from the design spec. Create 12 varied completed titles and 20 varied open titles across logo, brand identity, social media, packaging, poster, and UI/UX. Each completed project must carry `grossAmount`, `agreement.price`, and `budget.agreed` with the approved gross list. Each release uses `amount = grossAmount * 0.95`, `platformFee = grossAmount * 0.05`, `metadata.grossAmount`, and a deterministic release key. Each matching deposit uses the full gross amount and `metadata.escrowAmount`.

- [ ] **Step 4: Run GREEN**

Run: `node --test src/tests/demoSeedData.test.js` from `vesd/server`.
Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```powershell
git add vesd/server/src/seed/demoSeedData.js vesd/server/src/tests/demoSeedData.test.js
git commit -m "feat: add deterministic VESD seed fixtures"
```

### Task 2: Correct gross-revenue aggregation

**Files:**
- Create: `vesd/server/src/tests/revenueService.test.js`
- Create: `vesd/server/src/services/revenueService.js`
- Modify: `vesd/server/src/routes/main.routes.js:139-147`

- [ ] **Step 1: Write a failing service test**

Inject an aggregate function and assert that the returned object distinguishes gross revenue from platform profit and ignores deposits by requiring `type: 'release'` in the pipeline.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminRevenueSummary } from '../services/revenueService.js';

test('admin revenue sums release gross values without double counting deposits', async () => {
  let pipeline;
  const result = await getAdminRevenueSummary(async (value) => {
    pipeline = value;
    return [{ revenue: 8_000_000, platformProfit: 400_000 }];
  });
  assert.deepEqual(pipeline[0], { $match: { type: 'release', status: 'success' } });
  assert.deepEqual(result, { revenue: 8_000_000, platformProfit: 400_000 });
});
```

- [ ] **Step 2: Run RED**

Run: `node --test src/tests/revenueService.test.js` from `vesd/server`.
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement and wire the service**

The aggregation must sum `metadata.grossAmount`, falling back to `amount + platformFee` for legacy releases, and independently sum `platformFee`. Update `/dashboard/summary` to return `{ users, activeProjects, disputes, revenue, platformProfit }`.

- [ ] **Step 4: Run GREEN and regression tests**

Run: `node --test src/tests/revenueService.test.js src/tests/business.test.js` from `vesd/server`.
Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add vesd/server/src/services/revenueService.js vesd/server/src/tests/revenueService.test.js vesd/server/src/routes/main.routes.js
git commit -m "feat: report gross project revenue separately"
```

### Task 3: Collision-safe idempotent seed runner

**Files:**
- Create: `vesd/server/src/tests/demoSeedRunner.test.js`
- Create: `vesd/server/src/seed/seed-demo-data.js`
- Modify: `vesd/server/package.json`

- [ ] **Step 1: Write failing runner tests**

Export `seedDemoData({ models, connect, disconnect, hashPassword, log })`. Use in-memory repositories to prove that two runs leave exactly 24 users, 32 projects, 24 project transactions, 24 profiles, and 24 wallets; balances remain unchanged on the second run; an existing different user with a fixture email causes rejection before writes.

- [ ] **Step 2: Run RED**

Run: `node --test src/tests/demoSeedRunner.test.js` from `vesd/server`.
Expected: FAIL because the runner export does not exist.

- [ ] **Step 3: Implement preflight and writes**

Preflight all deterministic user/project/transaction IDs and all 24 emails. Reject any identity mismatch. Hash the shared password once with bcrypt cost 12. Use `$setOnInsert` for users, profiles, projects, deposits, and releases. Use `$set` with absolute fixture-derived values for fixture wallets so reruns do not increment balances. Never call `dropDatabase`, `deleteMany`, or update a document outside the deterministic fixture IDs.

Add:

```json
"seed:demo": "node src/seed/seed-demo-data.js"
```

The module calls itself only when executed as the entry file, keeping it importable for tests.

- [ ] **Step 4: Run GREEN**

Run: `node --test src/tests/demoSeedRunner.test.js src/tests/demoSeedData.test.js` from `vesd/server`.
Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add vesd/server/src/seed/seed-demo-data.js vesd/server/src/tests/demoSeedRunner.test.js vesd/server/package.json
git commit -m "feat: add additive idempotent demo seed runner"
```

### Task 4: Dashboard presentation

**Files:**
- Modify: `vesd/client/src/pages/dashboard/shared/Metric.tsx`
- Modify: `vesd/client/src/pages/dashboard/AdminPages.tsx`
- Modify: `vesd/client/src/pages/DashboardPages.test.tsx`

- [ ] **Step 1: Write a failing rendering contract**

Use `renderToStaticMarkup` with a minimal icon and assert that `Metric` renders an optional description. Assert existing calls without a description remain valid.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/pages/DashboardPages.test.tsx` from `vesd/client`.
Expected: FAIL because `Metric` does not accept or render `description`.

- [ ] **Step 3: Implement the UI**

Extend Metric props with `description?: string`. Render it below the value. Change the admin revenue card to:

```tsx
<Metric
  label="Doanh thu"
  value={`${(data?.revenue || 0).toLocaleString('vi-VN')}đ`}
  description={`Phí nền tảng: ${(data?.platformProfit || 0).toLocaleString('vi-VN')}đ`}
  icon={CreditCard}
/>
```

- [ ] **Step 4: Run GREEN and build**

Run: `npm test -- src/pages/DashboardPages.test.tsx` then `npm run build` from `vesd/client`.
Expected: tests and TypeScript/Vite build pass.

- [ ] **Step 5: Commit**

```powershell
git add vesd/client/src/pages/dashboard/shared/Metric.tsx vesd/client/src/pages/dashboard/AdminPages.tsx vesd/client/src/pages/DashboardPages.test.tsx
git commit -m "feat: distinguish revenue from platform fees"
```

### Task 5: Documentation and full static verification

**Files:**
- Modify: `vesd/README.md`

- [ ] **Step 1: Document additive seeding**

Document `npm run seed:demo --prefix server`, the 12-client/12-designer split, shared password, 12 completed projects totaling 8,000,000 VND, 20 initially unclaimed jobs, idempotent behavior, and the fact that the destructive base seed is not invoked.

- [ ] **Step 2: Run all tests and build**

Run from `vesd`:

```powershell
npm test --prefix server
npm test --prefix client
npm run build --prefix client
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit**

```powershell
git add vesd/README.md
git commit -m "docs: explain additive realistic demo seed"
```

### Task 6: Seed the current database and verify runtime

**Files:** No source changes expected.

- [ ] **Step 1: Capture before-state**

Run read-only counts for users, projects by status, transactions, and total gross release revenue. Save terminal output for comparison; do not write a file containing credentials.

- [ ] **Step 2: Execute the additive seed**

Run: `npm run seed:demo --prefix server` from `vesd`.
Expected summary: 24 accounts present, 12 completed fixture projects present, 20 fixture jobs present, gross fixture revenue 8,000,000 VND, platform fee 400,000 VND.

- [ ] **Step 3: Prove idempotency**

Run the same command a second time.
Expected: identical counts and totals; no duplicate-key error and no wallet balance increase.

- [ ] **Step 4: Verify the application**

At `http://localhost:5173/`, log in as admin and verify revenue `8.000.000đ` with fee `400.000đ`; log in with one seeded designer account and verify the job page includes the 20 new unassigned projects; log in with one seeded client account and verify authentication succeeds.

- [ ] **Step 5: Final regression verification**

Re-run server tests, client tests, and client build. Confirm the only untracked pre-existing file remains `vesd/server/src/seed/create-admin.js` unless the user changes it independently.
