import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_START_DATE,
  buildAnalyticsSummary,
  buildCalibratedBackfillMetrics,
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

test('calibrated backfill fits the current 74-user project scale', () => {
  const docs = buildCalibratedBackfillMetrics({
    now: new Date('2026-06-20T10:00:00.000Z'),
    targetUsers: 74
  });
  const summary = buildAnalyticsSummary(docs);
  assert.equal(summary.totals.users, 74);
  assert.ok(summary.totals.sessions >= 190);
  assert.ok(summary.totals.sessions <= 215);
  assert.ok(summary.totals.pageViews >= 420);
  assert.ok(summary.totals.pageViews <= 560);
  assert.ok(summary.conversions.escrowPaid >= 1);
  assert.ok(summary.conversions.rate >= 0.4);
  assert.ok(summary.conversions.rate <= 1.5);
  assert.ok(docs.every((doc) => doc.conversions.contacts <= doc.conversions.registrations));
  assert.ok(docs.every((doc) => doc.conversions.projectsCreated <= doc.conversions.contacts));
  assert.ok(docs.every((doc) => doc.conversions.escrowPaid <= doc.conversions.projectsCreated));
});

test('calibrated backfill keeps observed metrics and budgets the remaining users', () => {
  const observedByDate = new Map([[
    '2026-06-20',
    {
      date: '2026-06-20',
      sessions: 3,
      users: 3,
      newUsers: 1,
      returningUsers: 2,
      pageViews: 6,
      clicks: 2,
      bounces: 1,
      totalSessionDuration: 180,
      scrollDepthTotal: 210,
      scrollDepthEvents: 3,
      trafficSources: { direct: 3 },
      conversions: { registrations: 1, contacts: 1, projectsCreated: 0, escrowPaid: 0, premiumSubscriptions: 0 },
      technical: { pageLoadTime: 0.8, tti: 0.35, lcp: 1.1, fid: 12, inp: 40, cls: 0.01, uptime: 99.9, sampleCount: 2 },
      synthetic: false
    }
  ]]);
  const docs = buildCalibratedBackfillMetrics({
    now: new Date('2026-06-20T10:00:00.000Z'),
    targetUsers: 74,
    observedByDate
  });
  const summary = buildAnalyticsSummary(docs);
  const observedDay = docs.find((doc) => doc.date === '2026-06-20');
  assert.equal(summary.totals.users, 74);
  assert.ok(observedDay.users >= 3);
  assert.ok(observedDay.pageViews >= 6);
  assert.equal(observedDay.technical.sampleCount, 2);
  assert.equal(observedDay.synthetic, false);
});

test('calibrated backfill adds no fake users when observed users exceed target', () => {
  const observedByDate = new Map([[
    '2026-06-20',
    {
      date: '2026-06-20',
      sessions: 82,
      users: 80,
      newUsers: 50,
      returningUsers: 30,
      pageViews: 170,
      clicks: 20,
      bounces: 35,
      totalSessionDuration: 7200,
      scrollDepthTotal: 4200,
      scrollDepthEvents: 80,
      trafficSources: { direct: 80 },
      conversions: { registrations: 2, contacts: 1, projectsCreated: 0, escrowPaid: 0, premiumSubscriptions: 0 },
      technical: { uptime: 99.5, sampleCount: 0 },
      synthetic: false
    }
  ]]);
  const docs = buildCalibratedBackfillMetrics({
    now: new Date('2026-06-20T10:00:00.000Z'),
    targetUsers: 74,
    observedByDate
  });
  assert.equal(buildAnalyticsSummary(docs).totals.users, 80);
  assert.equal(docs.filter((doc) => doc.date !== '2026-06-20').reduce((sum, doc) => sum + doc.users, 0), 0);
});

test('session start is counted once per persistent session id', () => {
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set() }), true);
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set(['same-session']) }), false);
  assert.equal(shouldCountSessionStart({ payloadSessionId: '', knownSessionIds: new Set(['same-session']) }), false);
});
