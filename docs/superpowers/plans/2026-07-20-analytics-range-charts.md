# Analytics Range and Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa báo cáo analytics 1/7/30 ngày theo giờ Việt Nam, hiệu chỉnh tỷ lệ mô phỏng và nâng cấp dashboard bằng Recharts.

**Architecture:** Backend cung cấp một helper range duy nhất trả cả ISO boundary và Vietnam date key để mọi query dùng cùng semantics. Frontend chuyển dữ liệu API thành typed chart rows và dùng các component Recharts responsive, trong khi giữ nguyên endpoint, mutation AI report và các KPI hiện hữu.

**Tech Stack:** Node.js test runner, Express/Mongoose, React 18, TypeScript, TanStack Query, Tailwind CSS, Recharts, Vitest/Testing Library.

---

## File map

- Modify `vesd/server/src/services/analyticsService.js`: range Việt Nam, synthetic ratios và daily boundary.
- Modify `vesd/server/src/tests/analytics.test.js`: test range, tỷ lệ và funnel.
- Modify `vesd/client/package.json` và lockfile: thêm Recharts.
- Modify `vesd/client/src/pages/dashboard/AdminAnalyticsPage.tsx`: typed data, range buttons và charts.
- Create `vesd/client/src/pages/dashboard/analyticsChartData.ts`: format/mapping thuần cho chart.
- Create `vesd/client/src/pages/dashboard/analyticsChartData.test.ts`: unit tests mapping/format.
- Modify `vesd/client/src/pages/DashboardPages.test.tsx`: bỏ contract helper SVG cũ, giữ contract page.
- Modify `vesd/client/src/main.tsx` nếu việc lazy-loading route có thể làm cục bộ mà không refactor barrel exports.

### Task 1: Chuẩn hóa range theo giờ Việt Nam

**Files:**
- Modify: `vesd/server/src/tests/analytics.test.js`
- Modify: `vesd/server/src/services/analyticsService.js`

- [ ] **Step 1: Viết test thất bại cho 1/7/30 ngày**

Thêm assertions dùng `now = new Date('2026-07-20T18:30:00.000Z')` (01:30 ngày 21/07 tại Việt Nam):

```js
assert.deepEqual(getRangeWindow('1d', now).dateKeys, { start: '2026-07-21', end: '2026-07-21' });
assert.deepEqual(getRangeWindow('7d', now).dateKeys, { start: '2026-07-15', end: '2026-07-21' });
assert.deepEqual(getRangeWindow('30d', now).dateKeys, { start: '2026-06-22', end: '2026-07-21' });
assert.equal(getRangeWindow('1d', now).start.toISOString(), '2026-07-20T17:00:00.000Z');
```

- [ ] **Step 2: Chạy RED**

Run: `npm test -- --test-name-pattern="Vietnam calendar"`

Working directory: `vesd/server`

Expected: FAIL vì `dateKeys` chưa tồn tại và start đang làm tròn UTC.

- [ ] **Step 3: Viết helper range tối thiểu**

Trong service, thêm helper lấy date key Việt Nam, dịch date key theo UTC-safe arithmetic và chuyển đầu ngày Việt Nam sang UTC:

```js
const ANALYTICS_TIME_ZONE_OFFSET_HOURS = 7;

function shiftDateKey(key, days) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function vietnamStartOfDay(key) {
  return new Date(`${key}T00:00:00.000+07:00`);
}
```

`getRangeWindow()` phải trả `{ start, end: now, range, dateKeys: { start, end } }`; `all` dùng start key cố định. `ensureAnalyticsBackfill()` và `getAdminAnalytics()` query bằng `window.dateKeys`.

- [ ] **Step 4: Chạy GREEN**

Run: `npm test`

Working directory: `vesd/server`

Expected: toàn bộ server tests PASS.

- [ ] **Step 5: Commit**

```bash
git add vesd/server/src/services/analyticsService.js vesd/server/src/tests/analytics.test.js
git commit -m "fix: align analytics ranges to Vietnam calendar"
```

### Task 2: Hiệu chỉnh bounce và conversion synthetic

**Files:**
- Modify: `vesd/server/src/tests/analytics.test.js`
- Modify: `vesd/server/src/services/analyticsService.js`

- [ ] **Step 1: Viết test thất bại cho tỷ lệ**

Tạo 30 metrics bằng `buildCalibratedBackfillMetrics({ now, targetUsers: 240 })`, build summary và assert:

```js
assert.ok(summary.behaviour.bounceRate >= 21 && summary.behaviour.bounceRate <= 23);
assert.ok(summary.conversions.rate >= 1 && summary.conversions.rate <= 2);
assert.ok(docs.every((doc) => doc.conversions.registrations >= doc.conversions.contacts));
assert.ok(docs.every((doc) => doc.conversions.contacts >= doc.conversions.projectsCreated));
assert.ok(docs.every((doc) => doc.conversions.projectsCreated >= doc.conversions.escrowPaid));
```

- [ ] **Step 2: Chạy RED**

Run: `npm test -- --test-name-pattern="target rates"`

Expected: FAIL vì bounce hiện khoảng 38–52% và escrow khoảng 0,6% session.

- [ ] **Step 3: Điều chỉnh số đếm gốc**

Trong `buildFakeDailyMetric`, dùng biến thiên bounce nhỏ:

```js
const bounceRatio = clamp(0.218 + (index % 5) * 0.002 + (isWeekend ? 0.004 : 0), 0.21, 0.23);
const bounces = Math.round(sessions * bounceRatio);
```

Trong `applySyntheticConversions`, tăng funnel đủ để escrow đạt 1–2% nhưng vẫn giữ thứ tự:

```js
const registrations = Math.max(1, Math.round(syntheticSessions * 0.065));
const contacts = Math.max(1, Math.min(registrations, Math.round(syntheticSessions * 0.038)));
const projectsCreated = Math.max(1, Math.min(contacts, Math.round(syntheticSessions * 0.022)));
const escrowPaid = Math.max(1, Math.min(projectsCreated, Math.round(syntheticSessions * 0.014)));
```

- [ ] **Step 4: Chạy GREEN và regression**

Run: `npm test`

Expected: toàn bộ server tests PASS và tỷ lệ trong khoảng mục tiêu.

- [ ] **Step 5: Commit**

```bash
git add vesd/server/src/services/analyticsService.js vesd/server/src/tests/analytics.test.js
git commit -m "feat: calibrate analytics demo rates"
```

### Task 3: Thêm mapping chart có kiểu dữ liệu và Recharts

**Files:**
- Create: `vesd/client/src/pages/dashboard/analyticsChartData.ts`
- Create: `vesd/client/src/pages/dashboard/analyticsChartData.test.ts`
- Modify: `vesd/client/package.json`
- Modify: `vesd/client/package-lock.json`

- [ ] **Step 1: Cài dependency**

Run: `npm install recharts`

Working directory: `vesd/client`

Expected: package và lockfile thêm Recharts.

- [ ] **Step 2: Viết test RED cho mapper**

Test phải yêu cầu `RANGE_OPTIONS`, `formatChartDate`, `normaliseSeries` và `buildSourceRows`:

```ts
expect(RANGE_OPTIONS.map((item) => item.key)).toEqual(['1d', '7d', '30d', 'all']);
expect(formatChartDate('2026-07-20', '30d')).toBe('20/07');
expect(normaliseSeries([{ date: '2026-07-20', sessions: Number.NaN }], '7d')[0].sessions).toBe(0);
expect(buildSourceRows({ direct: 30, search: 20 })[0]).toMatchObject({ key: 'direct', value: 30, percent: 60 });
```

- [ ] **Step 3: Chạy RED**

Run: `npm test -- --run src/pages/dashboard/analyticsChartData.test.ts`

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 4: Implement mapper thuần**

Export typed `RangeKey`, `AnalyticsSeriesPoint`, `RANGE_OPTIONS`, `formatChartDate`, `normaliseSeries`, `buildSourceRows`, `buildFunnelRows`. Giá trị numeric không finite đổi thành 0; source sort giảm dần; funnel giữ thứ tự nghiệp vụ.

- [ ] **Step 5: Chạy GREEN**

Run: `npm test -- --run src/pages/dashboard/analyticsChartData.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vesd/client/package.json vesd/client/package-lock.json vesd/client/src/pages/dashboard/analyticsChartData.ts vesd/client/src/pages/dashboard/analyticsChartData.test.ts
git commit -m "feat: add analytics chart data model"
```

### Task 4: Nâng cấp dashboard analytics

**Files:**
- Modify: `vesd/client/src/pages/dashboard/AdminAnalyticsPage.tsx`
- Modify: `vesd/client/src/pages/DashboardPages.test.tsx`
- Modify: `vesd/client/src/main.tsx` only if route-local lazy import is safe.

- [ ] **Step 1: Viết component test RED**

Render page với QueryClient chứa fixture analytics. Assert có bốn nút range với `aria-pressed`, chart regions có label `Xu hướng truy cập`, `Tỷ lệ theo ngày`, `Nguồn truy cập`, `Phễu chuyển đổi`, và clicking `30 ngày` làm query key/API đổi sang `30d`.

- [ ] **Step 2: Chạy RED**

Run: `npm test -- --run src/pages/DashboardPages.test.tsx`

Expected: FAIL vì UI hiện dùng select và SVG không có chart region labels.

- [ ] **Step 3: Thay SVG bằng Recharts**

Trong page:

- Dùng `ResponsiveContainer`, `AreaChart`, `LineChart`, `BarChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `Area`, `Line`, `Bar`.
- Traffic area chart chứa sessions/users/pageViews.
- Rate line chart chứa bounce/conversion, format `%`.
- Technical charts dùng đúng suffix.
- Source horizontal bar dùng count và percent trong tooltip.
- Funnel bar dùng count, percent-of-first và giữ đúng thứ tự.
- Range buttons dùng `RANGE_OPTIONS`, `aria-pressed`, gọi `setRange`.
- Khi series rỗng, render `Chưa có dữ liệu trong khoảng thời gian này` thay chart.

- [ ] **Step 4: Chạy GREEN**

Run: `npm test -- --run src/pages/DashboardPages.test.tsx src/pages/dashboard/analyticsChartData.test.ts`

Expected: PASS.

- [ ] **Step 5: Chạy toàn bộ client và build**

Run: `npm test && npm run build`

Working directory: `vesd/client`

Expected: PASS; chỉ chấp nhận warning chunk-size hiện hữu, không có TypeScript error.

- [ ] **Step 6: Commit**

```bash
git add vesd/client/src/pages/dashboard/AdminAnalyticsPage.tsx vesd/client/src/pages/DashboardPages.test.tsx vesd/client/src/main.tsx
git commit -m "feat: redesign admin analytics charts"
```

### Task 5: QA và review cuối

- [ ] Chạy `npm test` trong `vesd/server`.
- [ ] Chạy `npm test` và `npm run build` trong `vesd/client`.
- [ ] Chạy `git diff --check` và xác nhận working tree sạch.
- [ ] QA `/admin/analytics` desktop/mobile với từng range.
- [ ] Review độc lập diff từ commit `409d5ff` đến HEAD; sửa mọi Critical/Important.
- [ ] Commit các chỉnh sửa review nếu có.
