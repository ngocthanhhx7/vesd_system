import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_START_DATE,
  buildAnalyticsSummary,
  buildFakeDailyMetric,
  buildMissingBackfillMetrics,
  getAiQuotaState,
  getRangeWindow,
  shouldCountSessionStart,
  normalizeRange
} from '../services/analyticsService.js';

test('analytics all range starts at project launch date', () => {
  const now = new Date('2026-06-20T10:00:00.000Z');
  const window = getRangeWindow('all', now);
  assert.equal(ANALYTICS_START_DATE, '2026-06-01');
  assert.equal(window.start.toISOString().slice(0, 10), '2026-06-01');
  assert.equal(window.end.toISOString(), now.toISOString());
});

test('analytics range normalizes unknown values to 7d', () => {
  assert.equal(normalizeRange('1d'), '1d');
  assert.equal(normalizeRange('unexpected'), '7d');
  assert.equal(normalizeRange(undefined), '7d');
});

test('fake daily metrics grow logically without impossible funnel values', () => {
  const first = buildFakeDailyMetric(new Date('2026-06-01T00:00:00.000Z'), 0);
  const later = buildFakeDailyMetric(new Date('2026-06-15T00:00:00.000Z'), 14);
  assert.ok(later.sessions > first.sessions);
  assert.ok(later.users > first.users);
  assert.ok(later.conversions.registrations <= later.sessions);
  assert.ok(later.conversions.projectsCreated <= later.conversions.registrations);
  assert.ok(later.conversions.escrowPaid <= later.conversions.projectsCreated);
});

test('analytics summary handles missing web vitals without NaN', () => {
  const summary = buildAnalyticsSummary([
    { ...buildFakeDailyMetric(new Date('2026-06-01T00:00:00.000Z'), 0), webVitals: {} },
    { ...buildFakeDailyMetric(new Date('2026-06-02T00:00:00.000Z'), 1), webVitals: { lcp: null, inp: undefined, cls: null } }
  ]);
  assert.equal(Number.isNaN(summary.technical.lcp), false);
  assert.equal(Number.isNaN(summary.technical.inp), false);
  assert.equal(Number.isNaN(summary.technical.cls), false);
  assert.ok(summary.traffic.sessions > 0);
  assert.ok(summary.conversions.rate >= 0);
});

test('AI quota allows first three uses and blocks the fourth', () => {
  assert.deepEqual(getAiQuotaState(0), { limit: 3, used: 0, remaining: 3, allowed: true });
  assert.deepEqual(getAiQuotaState(2), { limit: 3, used: 2, remaining: 1, allowed: true });
  assert.deepEqual(getAiQuotaState(3), { limit: 3, used: 3, remaining: 0, allowed: false });
  assert.deepEqual(getAiQuotaState(4), { limit: 3, used: 4, remaining: 0, allowed: false });
});

test('backfill creates only missing dates and preserves existing real dates', () => {
  const docs = buildMissingBackfillMetrics({
    existingDates: ['2026-06-03', '2026-06-20'],
    now: new Date('2026-06-20T10:00:00.000Z')
  });
  const dates = docs.map((doc) => doc.date);
  assert.equal(docs.length, 18);
  assert.equal(dates[0], '2026-06-01');
  assert.equal(dates[dates.length - 1], '2026-06-19');
  assert.equal(dates.includes('2026-06-03'), false);
  assert.equal(dates.includes('2026-06-20'), false);
  assert.ok(docs.every((doc) => doc.synthetic === true));
});

test('session start is counted once per persistent session id', () => {
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set() }), true);
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set(['same-session']) }), false);
  assert.equal(shouldCountSessionStart({ payloadSessionId: '', knownSessionIds: new Set(['same-session']) }), false);
});
