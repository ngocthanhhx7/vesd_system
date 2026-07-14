# Realistic Demo Data Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, visibly labelled coursework demo overlay with fictional users, completed projects producing exactly VND 8,000,000 simulated platform revenue, and 20 unclaimed jobs without writing to MongoDB.

**Architecture:** A pure fixture module owns all deterministic demo entities, while a pure overlay module merges them into selected API responses only when `VITE_DEMO_MODE=true`. Small presentational components provide the persistent disclosure and per-record badges; mutation guards prevent reserved demo identifiers from reaching backend endpoints.

**Tech Stack:** React 18, TypeScript, Vite environment variables, TanStack Query, Vitest, React DOM server rendering for presentational component tests.

---

## File Map

- Create `vesd/client/src/demo/demoData.ts`: typed deterministic fixtures and totals.
- Create `vesd/client/src/demo/demoData.test.ts`: fixture invariants and date/revenue tests.
- Create `vesd/client/src/demo/demoOverlay.ts`: flag parsing, response overlays, filtering, and mutation guard.
- Create `vesd/client/src/demo/demoOverlay.test.ts`: normal/demo response and mutation tests.
- Create `vesd/client/src/components/demo/DemoDisclosure.tsx`: banner and record badge.
- Create `vesd/client/src/components/demo/DemoDisclosure.test.tsx`: disclosure rendering tests.
- Modify `vesd/client/src/services/api.ts`: apply overlays to selected read endpoints and guard demo mutations.
- Modify `vesd/client/src/pages/dashboard/AdminPages.tsx`: labelled summary, users, and projects.
- Modify `vesd/client/src/pages/dashboard/ProjectWorkflowPages.tsx`: labelled open jobs and disabled claim action.
- Modify `vesd/client/.env.example`: document the feature flag.
- Modify `vesd/README.md`: explain safe demo-mode usage and limitations.

### Task 1: Deterministic demo fixtures

**Files:**
- Create: `vesd/client/src/demo/demoData.ts`
- Create: `vesd/client/src/demo/demoData.test.ts`

- [ ] **Step 1: Write failing fixture invariant tests**

Create tests that import the wished-for fixture API and assert exact counts,
reserved identifiers, fictional email domains, project states, date boundaries,
and the VND 8,000,000 platform-fee total:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEMO_LABEL,
  DEMO_REVENUE,
  demoClients,
  demoCompletedProjects,
  demoDesigners,
  demoOpenProjects,
  demoTransactions
} from './demoData';

describe('coursework demo fixtures', () => {
  it('has the approved entity counts', () => {
    expect(demoClients).toHaveLength(12);
    expect(demoDesigners).toHaveLength(10);
    expect(demoCompletedProjects).toHaveLength(8);
    expect(demoOpenProjects).toHaveLength(20);
  });

  it('marks every entity as simulated with reserved identities', () => {
    const entities = [...demoClients, ...demoDesigners, ...demoCompletedProjects, ...demoOpenProjects, ...demoTransactions];
    expect(entities.every((item) => item.isDemo && item.demoLabel === DEMO_LABEL)).toBe(true);
    expect(entities.every((item) => item._id.startsWith('demo-'))).toBe(true);
    expect([...demoClients, ...demoDesigners].every((user) => user.email.endsWith('@example.com'))).toBe(true);
  });

  it('keeps all open jobs unclaimed', () => {
    expect(demoOpenProjects.every((project) => project.status === 'pending_designer' && project.designerId === null)).toBe(true);
  });

  it('distributes successful revenue in the approved date window', () => {
    const from = new Date('2026-06-30T00:00:00.000Z').getTime();
    const through = new Date('2026-07-14T23:59:59.999Z').getTime();
    expect(demoTransactions.every((transaction) => transaction.status === 'success')).toBe(true);
    expect(demoTransactions.every((transaction) => {
      const time = new Date(transaction.createdAt).getTime();
      return time >= from && time <= through;
    })).toBe(true);
    expect(demoTransactions.reduce((sum, transaction) => sum + transaction.platformFee, 0)).toBe(DEMO_REVENUE);
    expect(DEMO_REVENUE).toBe(8_000_000);
  });
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run: `npm test --prefix vesd/client -- src/demo/demoData.test.ts`

Expected: FAIL because `./demoData` does not exist.

- [ ] **Step 3: Implement the fixture module**

Define focused types `DemoUser`, `DemoProject`, and `DemoTransaction`; export
`DEMO_LABEL`, `DEMO_REVENUE`, the five fixture arrays, and `demoUsers` /
`demoProjects` combined arrays. Use these exact fictional display names:

```ts
export const clientNames = [
  'Nguyễn Minh Anh', 'Trần Quốc Huy', 'Lê Thu Hà', 'Phạm Gia Bảo',
  'Võ Ngọc Lan', 'Đặng Hoàng Nam', 'Bùi Thanh Trúc', 'Đỗ Khánh Linh',
  'Hồ Đức Anh', 'Ngô Phương Thảo', 'Dương Tuấn Kiệt', 'Mai Nhật Vy'
];

export const designerNames = [
  'Lâm Hoài An', 'Phan Minh Khang', 'Trịnh Bảo Ngọc', 'Vũ Anh Quân',
  'Tạ Quỳnh Chi', 'Cao Nhật Minh', 'Đinh Thảo My', 'Lý Hoàng Phúc',
  'Chu Gia Hân', 'Huỳnh Tuấn Vũ'
];

const platformFees = [850_000, 1_150_000, 900_000, 1_300_000, 750_000, 1_050_000, 950_000, 1_050_000];
const transactionDates = [
  '2026-06-30T09:15:00.000Z', '2026-07-02T03:30:00.000Z',
  '2026-07-04T08:45:00.000Z', '2026-07-06T04:20:00.000Z',
  '2026-07-08T10:10:00.000Z', '2026-07-10T02:55:00.000Z',
  '2026-07-12T07:40:00.000Z', '2026-07-14T05:25:00.000Z'
];

const completedProjectSpecs = [
  ['Bộ nhận diện Tiệm bánh Mây', 'brand-identity'],
  ['Thiết kế ứng dụng học tiếng Anh LingoUp', 'ui-ux-design'],
  ['Bao bì cà phê rang Mộc Nhiên', 'packaging-design'],
  ['Logo phòng khám An Tâm', 'logo-design'],
  ['Bộ bài đăng khai trương Sora Café', 'social-media-design'],
  ['Poster lễ hội âm nhạc Campus Beat', 'poster-design'],
  ['Nhận diện thương hiệu mỹ phẩm Lụa', 'brand-identity'],
  ['Landing page nền tảng tuyển dụng NextStep', 'ui-ux-design']
] as const;

const openProjectSpecs = [
  ['Logo thương hiệu trà thảo mộc An Viên', 'logo-design', true],
  ['Bộ nhận diện cửa hàng thú cưng Paw House', 'brand-identity', false],
  ['Thiết kế 12 bài đăng tháng 7 cho Lumi Spa', 'social-media-design', true],
  ['Bao bì granola dinh dưỡng Hạt Nhà', 'packaging-design', false],
  ['UI ứng dụng quản lý chi tiêu sinh viên', 'ui-ux-design', false],
  ['Poster workshop nhiếp ảnh đường phố', 'poster-design', true],
  ['Logo studio nội thất Gỗ & Nắng', 'logo-design', false],
  ['Key visual chiến dịch mùa tựu trường', 'social-media-design', false],
  ['Nhận diện xe cà phê lưu động Ban Mai', 'brand-identity', true],
  ['Bao bì nến thơm Sương Đêm', 'packaging-design', false],
  ['UI website đặt lịch sân thể thao', 'ui-ux-design', true],
  ['Poster tuyển thành viên câu lạc bộ sáng tạo', 'poster-design', false],
  ['Logo nền tảng luyện phỏng vấn JobMate', 'logo-design', true],
  ['Bộ template mạng xã hội cho nha khoa Nụ Cười', 'social-media-design', false],
  ['Nhãn chai nước ép Fresh Day', 'packaging-design', true],
  ['Thiết kế dashboard quản lý kho mini', 'ui-ux-design', false],
  ['Bộ nhận diện homestay Đồi Gió', 'brand-identity', false],
  ['Poster giải chạy gây quỹ Green Steps', 'poster-design', true],
  ['Logo thương hiệu thời trang Linen Lab', 'logo-design', false],
  ['UI landing page khóa học thiết kế cơ bản', 'ui-ux-design', true]
] as const;
```

Generate 12 client users and 10 designer users with deterministic `demo-user-*`
IDs, `@example.com` emails, `roles`, `status: 'active'`, generic avatars, and the
mandatory disclosure fields. Generate eight completed projects linked to those
users with varied design categories and budgets equal to ten times their
platform fee. Generate one successful transaction per completed project.
Use `completedProjectSpecs` and `openProjectSpecs` exactly. Derive open-job
budgets as `1_500_000 + index * 250_000`, deadlines as 16–35 July 2026,
revision limits alternating between two and three, match scores as
`72 + (index % 6) * 4`, and priorities as premium for indexes divisible by five
and standard otherwise. Cycle the style tags `minimal`, `modern`, `friendly`,
`premium`, `bold`, and `editorial`; cycle deliverables appropriate to each
category. Set every open job's `designerId` to `null` and status to
`pending_designer`.

- [ ] **Step 4: Run fixture tests and verify GREEN**

Run: `npm test --prefix vesd/client -- src/demo/demoData.test.ts`

Expected: PASS with four passing tests.

- [ ] **Step 5: Commit the fixture slice**

```powershell
git add vesd/client/src/demo/demoData.ts vesd/client/src/demo/demoData.test.ts
git commit -m "feat: add deterministic coursework demo fixtures"
```

### Task 2: Pure response overlays and mutation guard

**Files:**
- Create: `vesd/client/src/demo/demoOverlay.ts`
- Create: `vesd/client/src/demo/demoOverlay.test.ts`

- [ ] **Step 1: Write failing overlay tests**

Test this wished-for API:

```ts
import { describe, expect, it } from 'vitest';
import { DEMO_REVENUE } from './demoData';
import {
  assertMutableId,
  isDemoMode,
  overlayAdminProjects,
  overlayAdminSummary,
  overlayAdminUsers,
  overlayOpenProjects
} from './demoOverlay';

describe('demo overlays', () => {
  it('enables demo mode only for the literal true value', () => {
    expect(isDemoMode('true')).toBe(true);
    expect(isDemoMode('false')).toBe(false);
    expect(isDemoMode(undefined)).toBe(false);
  });

  it('leaves responses untouched when disabled', () => {
    const summary = { users: 79, activeProjects: 22, revenue: 0, disputes: 0 };
    expect(overlayAdminSummary(summary, false)).toBe(summary);
  });

  it('creates a labelled demo summary without losing real values', () => {
    expect(overlayAdminSummary({ users: 79, activeProjects: 22, revenue: 0 }, true)).toMatchObject({
      users: 101,
      activeProjects: 42,
      revenue: DEMO_REVENUE,
      realRevenue: 0,
      isDemo: true
    });
  });

  it('appends users and projects while preserving server data', () => {
    const userResponse = overlayAdminUsers({ items: [{ _id: 'real-user' }], total: 79, page: 1, pages: 8 }, true);
    expect(userResponse.items[0]._id).toBe('real-user');
    expect(userResponse.total).toBe(101);
    expect(overlayAdminProjects([{ _id: 'real-project' }], true)).toHaveLength(29);
  });

  it('appends and filters open demo jobs from the request query', () => {
    const result = overlayOpenProjects({ items: [], total: 0, page: 1, pages: 0 }, '?category=logo-design&urgent=true', true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item: any) => item.category === 'logo-design' && item.urgent)).toBe(true);
  });

  it('rejects demo identifiers before a mutation can be sent', () => {
    expect(() => assertMutableId('demo-project-01')).toThrow('Dự án mô phỏng không thể thay đổi dữ liệu thật.');
    expect(assertMutableId('67a-real-id')).toBe('67a-real-id');
  });
});
```

- [ ] **Step 2: Run overlay tests and verify RED**

Run: `npm test --prefix vesd/client -- src/demo/demoOverlay.test.ts`

Expected: FAIL because `./demoOverlay` does not exist.

- [ ] **Step 3: Implement pure overlays**

Implement the functions imported above. `overlayAdminSummary` must add 22 demo
users and 20 active open projects, set `revenue` to `DEMO_REVENUE`, preserve the
original server revenue as `realRevenue`, and add the disclosure fields.
`overlayAdminUsers` must append `demoUsers`, increase `total`, and preserve
pagination fields. `overlayAdminProjects` must append all 28 demo projects.
`overlayOpenProjects` must parse `q`, `category`, `budget`, `urgent`, and `sort`
from the query string, filter/sort the fixture jobs, append them after real
results, and recalculate `total`/`pages` without hiding server fields.

Implement the guard exactly as:

```ts
export function assertMutableId(id: string) {
  if (id.startsWith('demo-')) {
    throw new Error('Dự án mô phỏng không thể thay đổi dữ liệu thật.');
  }
  return id;
}
```

- [ ] **Step 4: Run overlay tests and verify GREEN**

Run: `npm test --prefix vesd/client -- src/demo/demoOverlay.test.ts`

Expected: PASS with six passing tests.

- [ ] **Step 5: Commit overlay helpers**

```powershell
git add vesd/client/src/demo/demoOverlay.ts vesd/client/src/demo/demoOverlay.test.ts
git commit -m "feat: add safe demo response overlays"
```

### Task 3: Wire overlays into selected API endpoints

**Files:**
- Modify: `vesd/client/src/services/api.ts`
- Modify: `vesd/client/src/demo/demoOverlay.test.ts`

- [ ] **Step 1: Add a failing endpoint-boundary test**

Export a small pure path guard from `api.ts` and test that all demo mutation
paths throw while real paths pass:

```ts
import { assertRealMutationPath } from '../services/api';

it('blocks every demo-id mutation path', () => {
  expect(() => assertRealMutationPath('/projects/demo-project-01/claim')).toThrow();
  expect(() => assertRealMutationPath('/admin/users/demo-user-client-01/status')).toThrow();
  expect(assertRealMutationPath('/projects/67abc/claim')).toBe('/projects/67abc/claim');
});
```

- [ ] **Step 2: Run the boundary test and verify RED**

Run: `npm test --prefix vesd/client -- src/demo/demoOverlay.test.ts`

Expected: FAIL because `assertRealMutationPath` is not exported.

- [ ] **Step 3: Integrate demo mode into API reads and mutation boundary**

In `api.ts`, define:

```ts
export const DEMO_MODE = isDemoMode(import.meta.env.VITE_DEMO_MODE);

export function assertRealMutationPath(path: string) {
  const demoId = path.split(/[/?]/).find((part) => part.startsWith('demo-'));
  if (demoId) assertMutableId(demoId);
  return path;
}
```

Apply `assertRealMutationPath` in `api()` whenever `options.method` exists and
is not `GET`. Wrap only these endpoint results:

```ts
dashboardSummary: async () => overlayAdminSummary(await api<any>('/dashboard/summary'), DEMO_MODE),
openProjects: async (query = '') => overlayOpenProjects(await api<any>(`/projects/open${query}`), query, DEMO_MODE),
adminUsers: async (query = '') => overlayAdminUsers(await api<any>(`/admin/users${query}`), DEMO_MODE),
adminProjects: async () => overlayAdminProjects(await api<any[]>('/admin/projects'), DEMO_MODE),
```

Do not alter any server files or write endpoints.

- [ ] **Step 4: Run overlay and existing client tests**

Run: `npm test --prefix vesd/client -- src/demo/demoOverlay.test.ts`

Expected: PASS.

Run: `npm test --prefix vesd/client`

Expected: all client tests pass.

- [ ] **Step 5: Commit API integration**

```powershell
git add vesd/client/src/services/api.ts vesd/client/src/demo/demoOverlay.test.ts
git commit -m "feat: connect demo overlays to read endpoints"
```

### Task 4: Disclosure components and admin UI

**Files:**
- Create: `vesd/client/src/components/demo/DemoDisclosure.tsx`
- Create: `vesd/client/src/components/demo/DemoDisclosure.test.tsx`
- Modify: `vesd/client/src/pages/dashboard/AdminPages.tsx`

- [ ] **Step 1: Write failing disclosure rendering tests**

Use `renderToStaticMarkup` so no new testing dependency is needed:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DemoBadge, DemoBanner } from './DemoDisclosure';

describe('demo disclosure', () => {
  it('renders the full coursework disclosure', () => {
    const html = renderToStaticMarkup(<DemoBanner />);
    expect(html).toContain('Dữ liệu mô phỏng phục vụ đồ án');
    expect(html).toContain('Không phải giao dịch thực tế');
  });

  it('renders the compact record badge', () => {
    expect(renderToStaticMarkup(<DemoBadge />)).toContain('Mô phỏng');
  });
});
```

- [ ] **Step 2: Run disclosure tests and verify RED**

Run: `npm test --prefix vesd/client -- src/components/demo/DemoDisclosure.test.tsx`

Expected: FAIL because the component module does not exist.

- [ ] **Step 3: Implement disclosure components**

Create `DemoBanner` as an amber, accessible `role="status"` panel with the full
label and a short sentence stating the records and revenue are coursework
simulation only. Create `DemoBadge` using the existing `Badge` component with
warning tone and the text `Mô phỏng`.

- [ ] **Step 4: Integrate disclosure into admin pages**

In `AdminDashboard`, render `DemoBanner` when `data?.isDemo`. Change the revenue
metric label to `Doanh thu mô phỏng` in demo mode and append `đ` to the formatted
value. Add compact `Mô phỏng` badges near counts influenced by fixtures.

In the admin users and projects tables, render `DemoBadge` beside demo names or
titles. Disable user-status/project-status controls for `item.isDemo`; show the
text `Chỉ xem` instead of a mutation control. Render `DemoBanner` at the top of
both list pages whenever `DEMO_MODE` is enabled.

- [ ] **Step 5: Run disclosure and full client tests**

Run: `npm test --prefix vesd/client -- src/components/demo/DemoDisclosure.test.tsx`

Expected: PASS with two passing tests.

Run: `npm test --prefix vesd/client`

Expected: all client tests pass.

- [ ] **Step 6: Commit admin disclosure UI**

```powershell
git add vesd/client/src/components/demo/DemoDisclosure.tsx vesd/client/src/components/demo/DemoDisclosure.test.tsx vesd/client/src/pages/dashboard/AdminPages.tsx
git commit -m "feat: disclose simulated data in admin views"
```

### Task 5: Label and lock simulated designer jobs

**Files:**
- Modify: `vesd/client/src/pages/dashboard/ProjectWorkflowPages.tsx`
- Modify: `vesd/client/src/pages/DashboardPages.test.tsx`

- [ ] **Step 1: Write a failing job-action test**

Export a pure helper from `ProjectWorkflowPages.tsx` and test its contract:

```ts
import { demoJobAction } from './dashboard/ProjectWorkflowPages';

it('makes simulated jobs visibly read-only', () => {
  expect(demoJobAction({ isDemo: true })).toEqual({ disabled: true, label: 'Dự án mô phỏng — chỉ xem' });
  expect(demoJobAction({ isDemo: false })).toEqual({ disabled: false, label: 'Nhận dự án' });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test --prefix vesd/client -- src/pages/DashboardPages.test.tsx`

Expected: FAIL because `demoJobAction` is not exported.

- [ ] **Step 3: Implement job disclosure and locking**

Implement:

```ts
export function demoJobAction(project: { isDemo?: boolean }) {
  return project.isDemo
    ? { disabled: true, label: 'Dự án mô phỏng — chỉ xem' }
    : { disabled: false, label: 'Nhận dự án' };
}
```

Show `DemoBanner` above the results when `DEMO_MODE` is true. Add `DemoBadge` to
each simulated job card. Use `demoJobAction(project)` for button label and
disabled state, combined with `claimProject.isPending`, so clicking a demo job
can never call `endpoints.claimProject`.

- [ ] **Step 4: Run focused and full client tests**

Run: `npm test --prefix vesd/client -- src/pages/DashboardPages.test.tsx`

Expected: PASS.

Run: `npm test --prefix vesd/client`

Expected: all client tests pass.

- [ ] **Step 5: Commit designer job UI**

```powershell
git add vesd/client/src/pages/dashboard/ProjectWorkflowPages.tsx vesd/client/src/pages/DashboardPages.test.tsx
git commit -m "feat: label and lock simulated designer jobs"
```

### Task 6: Configuration, documentation, and final verification

**Files:**
- Modify: `vesd/client/.env.example`
- Modify: `vesd/README.md`

- [ ] **Step 1: Document the opt-in flag**

Append to `vesd/client/.env.example`:

```dotenv
# Coursework presentation only. Synthetic records stay client-side and are visibly labelled.
VITE_DEMO_MODE=false
```

Add a README section with these exact commands:

```powershell
Copy-Item client\.env.example client\.env
# Set VITE_DEMO_MODE=true in client\.env, then restart Vite.
npm run dev:client
```

Explain that the mode never seeds MongoDB, demo records are read-only, normal
mode is restored by setting the flag to false and restarting Vite, and the
exposed Atlas credential must be rotated rather than stored in the repository.

- [ ] **Step 2: Run the complete verification suite**

Run: `npm test --prefix vesd/client`

Expected: all client tests pass with zero failures.

Run: `npm run build --prefix vesd/client`

Expected: TypeScript and Vite build exit with code 0.

Run: `npm test --prefix vesd/server`

Expected: all server regression tests pass with zero failures.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Perform a local visual smoke test**

Start the client with `VITE_DEMO_MODE=true` and the existing local API. Verify:

1. `/admin` displays the disclosure and `8.000.000đ` under `Doanh thu mô phỏng`.
2. `/admin/users` shows fictional client/designer records with `Mô phỏng` badges and no enabled status mutation.
3. `/admin/projects` shows eight completed and 20 open simulated projects with badges.
4. `/designer/jobs` shows 20 unclaimed simulated jobs and disabled `Dự án mô phỏng — chỉ xem` buttons.
5. The browser network panel contains no mutation request for any `demo-*` ID.

- [ ] **Step 4: Commit documentation**

```powershell
git add vesd/client/.env.example vesd/README.md
git commit -m "docs: explain safe coursework demo mode"
```
