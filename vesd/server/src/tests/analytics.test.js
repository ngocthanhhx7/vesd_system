import test from 'node:test';
import assert from 'node:assert/strict';
import * as analyticsService from '../services/analyticsService.js';
import {
  ANALYTICS_START_DATE,
  buildAnalyticsSummary,
  buildCalibratedBackfillMetrics,
  buildFakeDailyMetric,
  buildMissingBackfillMetrics,
  buildObservedDailyMetrics,
  getAiQuotaState,
  getRangeWindow,
  shouldCountSessionStart,
  normalizeRange
} from '../services/analyticsService.js';

test('analytics all range starts at project launch date', () => {
  const now = new Date('2026-06-20T10:00:00.000Z');
  const window = getRangeWindow('all', now);
  assert.equal(ANALYTICS_START_DATE, '2026-06-01');
  assert.equal(window.start.toISOString(), '2026-05-31T17:00:00.000Z');
  assert.deepEqual(window.dateKeys, { start: '2026-06-01', end: '2026-06-20' });
  assert.equal(window.end.toISOString(), now.toISOString());
});

test('analytics ranges use Vietnam calendar days and UTC ISO day boundaries', () => {
  const now = new Date('2026-07-20T18:30:00.000Z'); // 01:30 on 21 July in Vietnam
  const expected = {
    '1d': { start: '2026-07-20T17:00:00.000Z', dateKeys: { start: '2026-07-21', end: '2026-07-21' } },
    '7d': { start: '2026-07-14T17:00:00.000Z', dateKeys: { start: '2026-07-15', end: '2026-07-21' } },
    '30d': { start: '2026-06-21T17:00:00.000Z', dateKeys: { start: '2026-06-22', end: '2026-07-21' } }
  };

  for (const [range, assertion] of Object.entries(expected)) {
    const window = getRangeWindow(range, now);
    assert.equal(window.start.toISOString(), assertion.start, range);
    assert.deepEqual(window.dateKeys, assertion.dateKeys, range);
    assert.equal(window.end.toISOString(), now.toISOString(), range);
  }
});

test('analytics event date key follows persisted server time instead of untrusted client time', () => {
  const serverNow = new Date('2026-07-20T18:30:00.000Z');
  assert.equal(
    analyticsService.getAnalyticsEventDateKey('2026-01-01T00:00:00.000Z', serverNow),
    '2026-07-21'
  );
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
  assert.ok(summary.totals.sessions >= 310);
  assert.ok(summary.totals.sessions <= 340);
  assert.ok(summary.totals.pageViews >= 720);
  assert.ok(summary.totals.pageViews <= 820);
  assert.ok(summary.conversions.escrowPaid >= 1);
  assert.ok(summary.behaviour.bounceRate >= 21);
  assert.ok(summary.behaviour.bounceRate <= 23);
  assert.ok(summary.conversions.rate >= 1);
  assert.ok(summary.conversions.rate <= 2);
  assert.ok(docs.every((doc) => doc.conversions.contacts <= doc.conversions.registrations));
  assert.ok(docs.every((doc) => doc.conversions.projectsCreated <= doc.conversions.contacts));
  assert.ok(docs.every((doc) => doc.conversions.escrowPaid <= doc.conversions.projectsCreated));
});

test('calibrated backfill keeps recent range rates plausible at the current project scale', () => {
  const now = new Date('2026-07-20T12:00:00.000Z');
  const docs = buildCalibratedBackfillMetrics({ now, targetUsers: 74 });

  for (const range of ['1d', '7d', '30d', 'all']) {
    const window = getRangeWindow(range, now);
    const rangeDocs = docs.filter((doc) => doc.date >= window.dateKeys.start && doc.date <= window.dateKeys.end);
    const summary = buildAnalyticsSummary(rangeDocs);
    assert.ok(summary.behaviour.bounceRate >= 21 && summary.behaviour.bounceRate <= 23, `${range} bounce rate`);
    if (range === '1d') {
      assert.ok(summary.conversions.rate === 0 || (summary.conversions.rate >= 1 && summary.conversions.rate <= 2), '1d sparse conversion rate');
    } else {
      assert.ok(summary.conversions.rate >= 1 && summary.conversions.rate <= 2, `${range} conversion rate`);
    }
  }
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

test('observed scroll depth uses max depth per session instead of summing scroll events', () => {
  const createdAt = new Date('2026-06-22T04:00:00.000Z');
  const events = [
    { type: 'page_view', sessionId: 'session-1', source: 'direct', isNewVisitor: true, createdAt },
    ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => ({
      type: 'scroll',
      sessionId: 'session-1',
      value,
      createdAt
    }))
  ];
  const metric = buildObservedDailyMetrics(events).get('2026-06-22');
  const summary = buildAnalyticsSummary([metric]);
  assert.equal(metric.scrollDepthTotal, 100);
  assert.equal(metric.scrollDepthEvents, 1);
  assert.equal(summary.behaviour.scrollDepth, 100);
});

test('observed scroll depth averages max depth across sessions', () => {
  const createdAt = new Date('2026-06-22T04:00:00.000Z');
  const events = [
    { type: 'page_view', sessionId: 'session-a', source: 'direct', isNewVisitor: true, createdAt },
    { type: 'page_view', sessionId: 'session-b', source: 'search', isNewVisitor: false, createdAt },
    { type: 'scroll', sessionId: 'session-a', value: 20, createdAt },
    { type: 'scroll', sessionId: 'session-a', value: 40, createdAt },
    { type: 'scroll', sessionId: 'session-b', value: 10, createdAt },
    { type: 'scroll', sessionId: 'session-b', value: 80, createdAt }
  ];
  const summary = buildAnalyticsSummary([buildObservedDailyMetrics(events).get('2026-06-22')]);
  assert.equal(summary.behaviour.scrollDepth, 60);
});

test('observed metrics count visitors separately from sessions and deduplicate click sessions', () => {
  const createdAt = new Date('2026-07-20T04:00:00.000Z');
  const events = [
    { type: 'page_view', sessionId: 'session-a', visitorId: 'visitor-a', source: 'direct', isNewVisitor: true, createdAt },
    { type: 'page_view', sessionId: 'session-a', visitorId: 'visitor-a', source: 'direct', isNewVisitor: true, createdAt },
    { type: 'page_view', sessionId: 'session-b', visitorId: 'visitor-a', source: 'direct', isNewVisitor: false, createdAt },
    { type: 'page_view', sessionId: 'session-c', visitorId: 'visitor-b', source: 'search', isNewVisitor: false, createdAt },
    { type: 'click', sessionId: 'session-a', createdAt },
    { type: 'click', sessionId: 'session-a', createdAt },
    { type: 'click', sessionId: 'session-c', createdAt }
  ];

  const metric = buildObservedDailyMetrics(events).get('2026-07-20');
  assert.equal(metric.sessions, 3);
  assert.equal(metric.users, 2);
  assert.equal(metric.newUsers, 1);
  assert.equal(metric.returningUsers, 1);
  assert.equal(metric.clicks, 3);
  assert.equal(metric.clickSessions, 2);
});

test('legacy observed sessions estimate returning visitors instead of equating every session to a user', () => {
  const createdAt = new Date('2026-07-20T04:00:00.000Z');
  const events = [
    { type: 'page_view', sessionId: 'new-session', isNewVisitor: true, createdAt },
    ...['a', 'b', 'c', 'd', 'e', 'f'].map((suffix) => ({
      type: 'page_view',
      sessionId: `returning-${suffix}`,
      isNewVisitor: false,
      createdAt
    }))
  ];

  const metric = buildObservedDailyMetrics(events).get('2026-07-20');
  assert.equal(metric.sessions, 7);
  assert.ok(metric.users < metric.sessions);
  assert.equal(metric.newUsers + metric.returningUsers, metric.users);
});

test('calibration repairs zero rates, impossible CTR and non-monotonic funnel when observed traffic exceeds user target', () => {
  const observedByDate = new Map([[
    '2026-07-20',
    {
      date: '2026-07-20',
      sessions: 156,
      users: 100,
      newUsers: 70,
      returningUsers: 30,
      pageViews: 906,
      clicks: 910,
      clickSessions: 56,
      bounces: 0,
      totalSessionDuration: 122616,
      scrollDepthTotal: 5400,
      scrollDepthEvents: 100,
      trafficSources: { direct: 100, search: 30, social: 20, referral: 6 },
      conversions: { registrations: 8, contacts: 1, projectsCreated: 13, escrowPaid: 0, premiumSubscriptions: 0 },
      technical: { uptime: 99.5, sampleCount: 0 },
      synthetic: false
    }
  ]]);
  const docs = buildCalibratedBackfillMetrics({
    now: new Date('2026-07-20T12:00:00.000Z'),
    targetUsers: 74,
    observedByDate
  });
  const summary = buildAnalyticsSummary(docs);

  assert.ok(summary.behaviour.bounceRate >= 21 && summary.behaviour.bounceRate <= 23);
  assert.ok(summary.conversions.rate >= 1 && summary.conversions.rate <= 2);
  assert.ok(summary.behaviour.clickThroughRate > 0 && summary.behaviour.clickThroughRate < 20);
  assert.ok(summary.conversions.contacts <= summary.conversions.registrations);
  assert.ok(summary.conversions.projectsCreated <= summary.conversions.contacts);
  assert.ok(summary.conversions.escrowPaid <= summary.conversions.projectsCreated);
  assert.ok(summary.conversions.premiumSubscriptions <= summary.conversions.escrowPaid);
});

test('calibrated observed traffic keeps bounce rate in range for every dashboard window', () => {
  const observedByDate = new Map();
  for (let day = 0; day < 30; day += 1) {
    const date = new Date(Date.UTC(2026, 5, 21 + day));
    const dateKey = date.toISOString().slice(0, 10);
    const sessions = day === 29 ? 17 : day < 23 ? 5 : 7;
    observedByDate.set(dateKey, {
      date: dateKey,
      sessions,
      users: Math.max(1, Math.round(sessions * 0.7)),
      newUsers: 1,
      returningUsers: Math.max(0, Math.round(sessions * 0.7) - 1),
      pageViews: sessions * 5,
      clicks: sessions * 4,
      clickSessions: Math.max(1, Math.round(sessions * 0.35)),
      bounces: 0,
      totalSessionDuration: sessions * 180,
      scrollDepthTotal: sessions * 50,
      trafficSources: { direct: sessions },
      conversions: {},
      technical: { uptime: 99.5, sampleCount: 0 },
      synthetic: false
    });
  }
  const now = new Date('2026-07-20T12:00:00.000Z');
  const docs = buildCalibratedBackfillMetrics({ now, targetUsers: 74, observedByDate });

  for (const range of ['1d', '7d', '30d', 'all']) {
    const window = getRangeWindow(range, now);
    const summary = buildAnalyticsSummary(docs.filter((doc) => doc.date >= window.dateKeys.start && doc.date <= window.dateKeys.end));
    assert.ok(summary.behaviour.bounceRate >= 21 && summary.behaviour.bounceRate <= 23, `${range}: ${summary.behaviour.bounceRate}`);
    assert.ok(summary.behaviour.scrollDepth >= 60 && summary.behaviour.scrollDepth <= 70, `${range}: ${summary.behaviour.scrollDepth}`);
  }
});

test('analytics summary clamps legacy inflated scroll depth to 100 percent', () => {
  const summary = buildAnalyticsSummary([{
    date: '2026-06-22',
    sessions: 1,
    users: 1,
    pageViews: 1,
    clicks: 0,
    bounces: 0,
    totalSessionDuration: 0,
    scrollDepthTotal: 550,
    trafficSources: {},
    conversions: {},
    technical: {}
  }]);
  assert.equal(summary.behaviour.scrollDepth, 100);
});

test('session start is counted once per persistent session id', () => {
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set() }), true);
  assert.equal(shouldCountSessionStart({ payloadSessionId: 'same-session', knownSessionIds: new Set(['same-session']) }), false);
  assert.equal(shouldCountSessionStart({ payloadSessionId: '', knownSessionIds: new Set(['same-session']) }), false);
});
