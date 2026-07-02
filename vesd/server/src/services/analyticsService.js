import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import {
  AnalyticsAiReport,
  AnalyticsAiUsage,
  AnalyticsDailyMetric,
  AnalyticsEvent,
  User
} from '../models/index.js';

export const ANALYTICS_START_DATE = '2026-06-01';
export const ANALYTICS_AI_DAILY_LIMIT = 3;
const RANGE_DAYS = { '1d': 1, '7d': 7, '30d': 30 };
const TRAFFIC_SOURCES = ['direct', 'search', 'social', 'referral', 'email', 'paid', 'unknown'];
const CONVERSION_KEYS = ['registrations', 'contacts', 'projectsCreated', 'escrowPaid', 'premiumSubscriptions'];
const WEB_VITAL_KEYS = ['pageLoadTime', 'tti', 'lcp', 'fid', 'inp', 'cls'];

export function normalizeRange(range) {
  return ['1d', '7d', '30d', 'all'].includes(range) ? range : '7d';
}

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

function dayKeyInVietnam(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '01';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function getRangeWindow(range, now = new Date()) {
  const normalized = normalizeRange(range);
  if (normalized === 'all') return { start: dateFromKey(ANALYTICS_START_DATE), end: now, range: normalized };
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - RANGE_DAYS[normalized] + 1);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end: now, range: normalized };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function emptyConversions() {
  return Object.fromEntries(CONVERSION_KEYS.map((key) => [key, 0]));
}

function emptySources() {
  return Object.fromEntries(TRAFFIC_SOURCES.map((key) => [key, 0]));
}

function cleanSources(value = {}) {
  return { ...emptySources(), ...(value?.toObject?.() || value || {}) };
}

function cleanConversions(value = {}) {
  return { ...emptyConversions(), ...(value?.toObject?.() || value || {}) };
}

function distributeIntegerBudget(total, weights) {
  const budget = Math.max(Math.round(Number(total) || 0), 0);
  if (!weights.length || budget === 0) return weights.map(() => 0);
  const weightSum = weights.reduce((sum, value) => sum + Math.max(value, 0), 0) || 1;
  const raw = weights.map((weight) => (Math.max(weight, 0) / weightSum) * budget);
  const base = raw.map(Math.floor);
  let remainder = budget - base.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remainder > 0) {
        base[index] += 1;
        remainder -= 1;
      }
    });
  return base;
}

function splitInteger(total, ratios) {
  const keys = Object.keys(ratios);
  const allocations = distributeIntegerBudget(total, keys.map((key) => ratios[key]));
  return Object.fromEntries(keys.map((key, index) => [key, allocations[index]]));
}

function buildTechnicalMetric(index = 0) {
  return {
    pageLoadTime: round(clamp(2.2 - index * 0.012, 1.75, 2.25)),
    tti: round(clamp(3.05 - index * 0.014, 2.35, 3.1)),
    lcp: round(clamp(2.55 - index * 0.012, 2.0, 2.6)),
    fid: Math.round(clamp(42 - index * 0.5, 28, 44)),
    inp: Math.round(clamp(205 - index * 1.8, 160, 210)),
    cls: round(clamp(0.095 - index * 0.0015, 0.055, 0.1), 3),
    uptime: round(clamp(99.32 + index * 0.012, 99.3, 99.82))
  };
}

export function buildFakeDailyMetric(date, index = 0, userBudget) {
  const weekday = date.getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const users = Math.max(Math.round(Number(userBudget ?? (1 + index * 0.25)) || 0), 0);
  const sessionRatio = clamp(2.62 + (index % 4) * 0.08 - (isWeekend ? 0.12 : 0), 2.48, 2.9);
  const sessions = users > 0 ? Math.max(users, Math.round(users * sessionRatio)) : 0;
  const pageViews = Math.round(sessions * (2.22 + (index % 3) * 0.14));
  const clicks = Math.round(pageViews * clamp(0.105 + index * 0.0015, 0.1, 0.16));
  const bounces = Math.round(sessions * clamp(0.49 - index * 0.003 + (isWeekend ? 0.03 : 0), 0.38, 0.52));
  const newUsers = Math.round(users * clamp(0.54 - index * 0.006, 0.34, 0.56));
  const returningUsers = Math.max(users - newUsers, 0);
  const registrations = 0;
  const contacts = Math.round(registrations * clamp(0.62 + index * 0.002, 0.55, 0.78));
  const projectsCreated = Math.round(contacts * clamp(0.48 + index * 0.001, 0.42, 0.62));
  const escrowPaid = Math.round(projectsCreated * clamp(0.42 + index * 0.001, 0.35, 0.54));
  const premiumSubscriptions = Math.max(0, Math.round(registrations * clamp(0.14 + index * 0.001, 0.1, 0.22)));
  const sourceBase = splitInteger(sessions, {
    direct: 0.36,
    search: 0.26,
    social: 0.18,
    referral: 0.1,
    email: 0.05,
    paid: 0.02,
    unknown: 0.03
  });

  return {
    date: utcDateKey(date),
    sessions,
    users,
    newUsers,
    returningUsers,
    pageViews,
    clicks,
    bounces,
    totalSessionDuration: Math.round(sessions * (92 + index * 3.5 + (isWeekend ? -8 : 5))),
    scrollDepthTotal: Math.round(sessions * clamp(51 + index * 0.8, 48, 74)),
    scrollDepthEvents: sessions,
    trafficSources: sourceBase,
    conversions: { registrations, contacts, projectsCreated, escrowPaid, premiumSubscriptions },
    technical: buildTechnicalMetric(index),
    synthetic: true
  };
}

function addMetricValues(base, extra = {}) {
  base.sessions += Number(extra.sessions) || 0;
  base.users += Number(extra.users) || 0;
  base.newUsers += Number(extra.newUsers) || 0;
  base.returningUsers += Number(extra.returningUsers) || 0;
  base.pageViews += Number(extra.pageViews) || 0;
  base.clicks += Number(extra.clicks) || 0;
  base.bounces += Number(extra.bounces) || 0;
  base.totalSessionDuration += Number(extra.totalSessionDuration) || 0;
  base.scrollDepthTotal += Number(extra.scrollDepthTotal) || 0;
  base.scrollDepthEvents += Number(extra.scrollDepthEvents) || 0;
  const sources = cleanSources(extra.trafficSources);
  const conversions = cleanConversions(extra.conversions);
  for (const key of TRAFFIC_SOURCES) base.trafficSources[key] = (base.trafficSources[key] || 0) + (Number(sources[key]) || 0);
  for (const key of CONVERSION_KEYS) base.conversions[key] = (base.conversions[key] || 0) + (Number(conversions[key]) || 0);
  if ((Number(extra.technical?.sampleCount) || 0) > 0) base.technical = { ...extra.technical };
  if (extra.synthetic === false) base.synthetic = false;
  return base;
}

function applySyntheticConversions(metrics) {
  const syntheticMetrics = metrics.filter((metric) => metric.users > 0);
  const syntheticUsers = syntheticMetrics.reduce((sum, metric) => sum + metric.users, 0);
  const syntheticSessions = syntheticMetrics.reduce((sum, metric) => sum + metric.sessions, 0);
  const registrations = Math.max(1, Math.round(syntheticUsers * 0.11));
  const contacts = Math.max(1, Math.min(registrations, Math.round(registrations * 0.65)));
  const projectsCreated = Math.max(1, Math.min(contacts, Math.round(contacts * 0.5)));
  const escrowPaid = Math.max(1, Math.min(projectsCreated, Math.round(syntheticSessions * 0.006)));
  const premiumSubscriptions = Math.max(0, Math.min(registrations, Math.round(registrations * 0.16)));
  const budgets = { registrations, contacts, projectsCreated, escrowPaid, premiumSubscriptions };
  const weights = syntheticMetrics.map((metric, index) => metric.users + (index / Math.max(syntheticMetrics.length - 1, 1)) * 2);

  for (const key of CONVERSION_KEYS) {
    const allocations = distributeIntegerBudget(budgets[key], weights);
    syntheticMetrics.forEach((metric, index) => {
      metric.conversions[key] += allocations[index];
    });
  }
  for (const metric of syntheticMetrics) {
    metric.conversions.contacts = Math.min(metric.conversions.contacts, metric.conversions.registrations);
    metric.conversions.projectsCreated = Math.min(metric.conversions.projectsCreated, metric.conversions.contacts);
    metric.conversions.escrowPaid = Math.min(metric.conversions.escrowPaid, metric.conversions.projectsCreated);
    metric.conversions.premiumSubscriptions = Math.min(metric.conversions.premiumSubscriptions, metric.conversions.registrations);
  }
  return metrics;
}

function metricFromEventDate(date) {
  return {
    date,
    sessions: 0,
    users: 0,
    newUsers: 0,
    returningUsers: 0,
    pageViews: 0,
    clicks: 0,
    bounces: 0,
    totalSessionDuration: 0,
    scrollDepthTotal: 0,
    scrollDepthEvents: 0,
    trafficSources: emptySources(),
    conversions: emptyConversions(),
    technical: { uptime: 99.5, sampleCount: 0 },
    synthetic: false,
    _sessionIds: new Set(),
    _scrollDepthBySession: new Map()
  };
}

export function buildObservedDailyMetrics(events = []) {
  const byDate = new Map();
  for (const event of events) {
    const date = dayKeyInVietnam(event.createdAt || new Date());
    const metric = byDate.get(date) || metricFromEventDate(date);
    const source = TRAFFIC_SOURCES.includes(event.source) ? event.source : 'unknown';
    if (event.type === 'page_view') {
      metric.pageViews += 1;
      const sessionId = String(event.sessionId || '').trim();
      if (sessionId && !metric._sessionIds.has(sessionId)) {
        metric._sessionIds.add(sessionId);
        metric.sessions += 1;
        metric.users += 1;
        if (event.isNewVisitor) metric.newUsers += 1;
        else metric.returningUsers += 1;
        metric.trafficSources[source] = (metric.trafficSources[source] || 0) + 1;
      }
    }
    if (event.type === 'click') metric.clicks += 1;
    if (event.type === 'scroll') {
      const sessionId = String(event.sessionId || '').trim();
      if (sessionId) {
        const depth = clamp(Number(event.value) || 0, 0, 100);
        metric._scrollDepthBySession.set(sessionId, Math.max(metric._scrollDepthBySession.get(sessionId) || 0, depth));
      }
    }
    if (event.type === 'session') {
      metric.totalSessionDuration += Math.max(Number(event.value) || 0, 0);
      if (event.metadata?.isBounce || event.isBounce) metric.bounces += 1;
    }
    if (event.type === 'conversion') {
      const conversionType = event.metadata?.conversionType;
      const map = {
        registration: 'registrations',
        contact: 'contacts',
        project_created: 'projectsCreated',
        escrow_paid: 'escrowPaid',
        premium_subscription: 'premiumSubscriptions'
      };
      const key = map[conversionType];
      if (key) metric.conversions[key] += 1;
    }
    byDate.set(date, metric);
  }
  for (const metric of byDate.values()) {
    const depths = [...metric._scrollDepthBySession.values()];
    metric.scrollDepthTotal = depths.reduce((sum, value) => sum + value, 0);
    metric.scrollDepthEvents = depths.length;
    delete metric._sessionIds;
    delete metric._scrollDepthBySession;
  }
  return byDate;
}

export function buildCalibratedBackfillMetrics({
  now = new Date(),
  targetUsers = 0,
  observedByDate = new Map(),
  preservedByDate = new Map()
} = {}) {
  const start = dateFromKey(ANALYTICS_START_DATE);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const dates = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(new Date(cursor));
  }
  const observed = observedByDate instanceof Map ? observedByDate : new Map(Object.entries(observedByDate || {}));
  const preserved = preservedByDate instanceof Map ? preservedByDate : new Map(Object.entries(preservedByDate || {}));
  const observedUsers = [...observed.values()].reduce((sum, metric) => sum + (Number(metric.users) || 0), 0);
  const remainingUsers = Math.max(Math.round(Number(targetUsers) || 0) - observedUsers, 0);
  const allocations = distributeIntegerBudget(remainingUsers, dates.map((date, index) => {
    const weekday = date.getUTCDay();
    const weekendPenalty = weekday === 0 || weekday === 6 ? -0.25 : 0;
    return 0.85 + (index / Math.max(dates.length - 1, 1)) * 1.45 + weekendPenalty;
  }));

  const syntheticMetrics = applySyntheticConversions(dates.map((date, index) => {
    return buildFakeDailyMetric(date, index, allocations[index]);
  }));

  return syntheticMetrics.map((metric) => {
    const dateKey = metric.date;
    addMetricValues(metric, observed.get(dateKey));
    const preservedMetric = preserved.get(dateKey);
    if ((Number(preservedMetric?.technical?.sampleCount) || 0) > 0) {
      metric.technical = { ...(preservedMetric.technical?.toObject?.() || preservedMetric.technical || {}) };
      metric.synthetic = false;
    }
    return metric;
  });
}

export function buildMissingBackfillMetrics({ existingDates = [], now = new Date() } = {}) {
  const existing = new Set(existingDates);
  const start = dateFromKey(ANALYTICS_START_DATE);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const docs = [];
  for (let cursor = new Date(start), index = 0; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1), index += 1) {
    const key = utcDateKey(cursor);
    if (!existing.has(key)) docs.push(buildFakeDailyMetric(new Date(cursor), index));
  }
  return docs;
}

export function shouldCountSessionStart({ payloadSessionId, knownSessionIds = new Set() } = {}) {
  const sessionId = String(payloadSessionId || '').trim();
  return Boolean(sessionId && !knownSessionIds.has(sessionId));
}

function avg(values, fallback = 0) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return fallback;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function sumBy(metrics, key) {
  return metrics.reduce((sum, metric) => sum + (Number(metric[key]) || 0), 0);
}

function sumObject(metrics, key, names) {
  return Object.fromEntries(names.map((name) => [
    name,
    metrics.reduce((sum, metric) => sum + (Number(metric[key]?.[name]) || 0), 0)
  ]));
}

export function buildAnalyticsSummary(metrics = []) {
  const days = metrics.map((metric) => ({
    date: metric.date,
    sessions: Number(metric.sessions) || 0,
    users: Number(metric.users) || 0,
    pageViews: Number(metric.pageViews) || 0,
    bounceRate: round(((Number(metric.bounces) || 0) / Math.max(Number(metric.sessions) || 0, 1)) * 100),
    conversionRate: round(((Number(metric.conversions?.escrowPaid) || 0) / Math.max(Number(metric.sessions) || 0, 1)) * 100),
    pageLoadTime: Number(metric.technical?.pageLoadTime) || 0,
    tti: Number(metric.technical?.tti) || 0,
    lcp: Number(metric.technical?.lcp) || 0,
    inp: Number(metric.technical?.inp) || 0,
    cls: Number(metric.technical?.cls) || 0,
    uptime: Number(metric.technical?.uptime) || 0
  }));
  const sessions = sumBy(metrics, 'sessions');
  const pageViews = sumBy(metrics, 'pageViews');
  const clicks = sumBy(metrics, 'clicks');
  const bounces = sumBy(metrics, 'bounces');
  const conversions = sumObject(metrics, 'conversions', CONVERSION_KEYS);
  const sources = sumObject(metrics, 'trafficSources', TRAFFIC_SOURCES);
  const users = sumBy(metrics, 'users');
  const newUsers = sumBy(metrics, 'newUsers');
  const returningUsers = sumBy(metrics, 'returningUsers');
  const totalSessionDuration = sumBy(metrics, 'totalSessionDuration');
  const scrollDepthTotal = sumBy(metrics, 'scrollDepthTotal');

  return {
    totals: { sessions, users, newUsers, returningUsers, pageViews, clicks },
    traffic: {
      sessions,
      users,
      pageViews,
      sources,
      newVsReturning: { newUsers, returningUsers }
    },
    behaviour: {
      bounceRate: round((bounces / Math.max(sessions, 1)) * 100),
      averageSessionDuration: Math.round(totalSessionDuration / Math.max(sessions, 1)),
      pagesPerSession: round(pageViews / Math.max(sessions, 1)),
      clickThroughRate: round((clicks / Math.max(pageViews, 1)) * 100),
      scrollDepth: round(clamp(scrollDepthTotal / Math.max(sessions, 1), 0, 100))
    },
    conversions: {
      ...conversions,
      rate: round((conversions.escrowPaid / Math.max(sessions, 1)) * 100)
    },
    technical: {
      pageLoadTime: round(avg(metrics.map((metric) => metric.technical?.pageLoadTime))),
      tti: round(avg(metrics.map((metric) => metric.technical?.tti))),
      lcp: round(avg(metrics.map((metric) => metric.technical?.lcp))),
      fid: Math.round(avg(metrics.map((metric) => metric.technical?.fid))),
      inp: Math.round(avg(metrics.map((metric) => metric.technical?.inp))),
      cls: round(avg(metrics.map((metric) => metric.technical?.cls)), 3),
      uptime: round(avg(metrics.map((metric) => metric.technical?.uptime), 99.5))
    },
    series: days
  };
}

export function getAiQuotaState(used, limit = ANALYTICS_AI_DAILY_LIMIT) {
  const numericUsed = Number(used) || 0;
  const remaining = Math.max(limit - numericUsed, 0);
  return { limit, used: numericUsed, remaining, allowed: numericUsed < limit };
}

function sourceFromPayload(payload = {}) {
  const source = String(payload.source || payload.utmSource || '').toLowerCase();
  if (TRAFFIC_SOURCES.includes(source)) return source;
  const referrer = String(payload.referrer || '');
  if (!referrer) return 'direct';
  if (/google|bing|yahoo|duckduckgo|coccoc/i.test(referrer)) return 'search';
  if (/facebook|instagram|tiktok|linkedin|twitter|x\.com/i.test(referrer)) return 'social';
  return 'referral';
}

function averageWithCount(currentAverage, currentCount, nextValue) {
  const value = Number(nextValue);
  if (!Number.isFinite(value) || value <= 0) return currentAverage || 0;
  const count = Math.max(Number(currentCount) || 0, 0);
  return round((((Number(currentAverage) || 0) * count) + value) / (count + 1), value < 1 ? 3 : 2);
}

async function ensureDailyMetric(dateKey) {
  let metric = await AnalyticsDailyMetric.findOne({ date: dateKey });
  if (!metric) {
    metric = await AnalyticsDailyMetric.create({
      date: dateKey,
      trafficSources: emptySources(),
      conversions: emptyConversions(),
      technical: { uptime: 99.5 },
      synthetic: false
    });
  }
  return metric;
}

export async function ensureAnalyticsBackfill(now = new Date()) {
  const window = getRangeWindow('all', now);
  const startKey = utcDateKey(window.start);
  const endKey = utcDateKey(window.end);
  const [existingMetrics, events, targetUsers] = await Promise.all([
    AnalyticsDailyMetric.find({ date: { $gte: startKey, $lte: endKey } }).lean(),
    AnalyticsEvent.find({ createdAt: { $gte: window.start, $lte: window.end } }).lean(),
    User.countDocuments()
  ]);
  const preservedByDate = new Map(existingMetrics.map((metric) => [metric.date, metric]));
  const docs = buildCalibratedBackfillMetrics({
    now,
    targetUsers,
    observedByDate: buildObservedDailyMetrics(events),
    preservedByDate
  });
  if (docs.length) {
    const result = await AnalyticsDailyMetric.bulkWrite(docs.map((doc) => ({
      updateOne: {
        filter: { date: doc.date },
        update: { $set: doc },
        upsert: true
      }
    })));
    return {
      inserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      calibrated: docs.length,
      targetUsers
    };
  }
  return { inserted: 0, modified: 0, calibrated: 0, targetUsers };
}

export async function recordAnalyticsEvent(payload = {}, req = {}) {
  const type = ['page_view', 'click', 'scroll', 'session', 'performance', 'conversion'].includes(payload.type) ? payload.type : 'click';
  const sessionId = String(payload.sessionId || req.get?.('X-Analytics-Session-ID') || '').slice(0, 128);
  const dateKey = dayKeyInVietnam(payload.timestamp ? new Date(payload.timestamp) : new Date());
  const dayStart = dateFromKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const scrollDepth = type === 'scroll' ? clamp(Number(payload.value) || 0, 0, 100) : 0;
  const existingPageViewSession = type === 'page_view' && sessionId
    ? await AnalyticsEvent.exists({
      type: 'page_view',
      sessionId,
      createdAt: { $gte: dayStart, $lt: dayEnd }
    })
    : null;
  const previousScrollEvent = type === 'scroll' && sessionId
    ? await AnalyticsEvent.findOne({
      type: 'scroll',
      sessionId,
      createdAt: { $gte: dayStart, $lt: dayEnd }
    }).sort({ value: -1 }).select('value').lean()
    : null;
  await AnalyticsEvent.create({
    type,
    sessionId,
    userId: req.user?._id,
    path: String(payload.path || '').slice(0, 500),
    title: String(payload.title || '').slice(0, 250),
    source: sourceFromPayload(payload),
    isNewVisitor: Boolean(payload.isNewVisitor),
    value: Number(payload.value) || 0,
    metadata: payload.metadata || {}
  });
  const metric = await ensureDailyMetric(dateKey);
  const source = sourceFromPayload(payload);
  metric.trafficSources = { ...emptySources(), ...(metric.trafficSources?.toObject?.() || metric.trafficSources || {}) };
  metric.conversions = { ...emptyConversions(), ...(metric.conversions?.toObject?.() || metric.conversions || {}) };
  if (type === 'page_view') {
    const countSessionStart = Boolean(payload.isSessionStart && shouldCountSessionStart({
      payloadSessionId: sessionId,
      knownSessionIds: existingPageViewSession ? new Set([sessionId]) : new Set()
    }));
    metric.sessions += countSessionStart ? 1 : 0;
    metric.users += countSessionStart ? 1 : 0;
    metric.newUsers += payload.isNewVisitor && countSessionStart ? 1 : 0;
    metric.returningUsers += !payload.isNewVisitor && countSessionStart ? 1 : 0;
    metric.pageViews += 1;
    metric.trafficSources[source] = (metric.trafficSources[source] || 0) + (countSessionStart ? 1 : 0);
  }
  if (type === 'click') metric.clicks += 1;
  if (type === 'scroll') {
    const previousMax = Number(previousScrollEvent?.value) || 0;
    if (sessionId) {
      const delta = Math.max(scrollDepth - previousMax, 0);
      metric.scrollDepthTotal = (Number(metric.scrollDepthTotal) || 0) + delta;
      metric.scrollDepthEvents += previousMax > 0 ? 0 : 1;
    } else {
      metric.scrollDepthTotal = (Number(metric.scrollDepthTotal) || 0) + scrollDepth;
      metric.scrollDepthEvents += 1;
    }
  }
  if (type === 'session') {
    metric.totalSessionDuration += Math.max(Number(payload.value) || 0, 0);
    if (payload.isBounce) metric.bounces += 1;
  }
  metric.synthetic = false;
  await metric.save();
  return { ok: true };
}

export async function recordPerformanceEvent(payload = {}, req = {}) {
  await recordAnalyticsEvent({ ...payload, type: 'performance' }, req);
  const dateKey = dayKeyInVietnam(payload.timestamp ? new Date(payload.timestamp) : new Date());
  const metric = await ensureDailyMetric(dateKey);
  const currentCount = Number(metric.technical?.sampleCount) || 0;
  const technical = { ...(metric.technical?.toObject?.() || metric.technical || {}) };
  for (const key of WEB_VITAL_KEYS) {
    if (payload[key] != null) technical[key] = averageWithCount(technical[key], currentCount, payload[key]);
  }
  technical.uptime = averageWithCount(technical.uptime || 99.5, currentCount, payload.uptime || 99.5);
  technical.sampleCount = currentCount + 1;
  metric.technical = technical;
  metric.synthetic = false;
  await metric.save();
  return { ok: true };
}

export async function recordConversion(req, conversionType, metadata = {}) {
  const map = {
    registration: 'registrations',
    contact: 'contacts',
    project_created: 'projectsCreated',
    escrow_paid: 'escrowPaid',
    premium_subscription: 'premiumSubscriptions'
  };
  const key = map[conversionType];
  if (!key) return null;
  const sessionId = String(req?.get?.('X-Analytics-Session-ID') || '').slice(0, 128);
  const dateKey = dayKeyInVietnam(new Date());
  await AnalyticsEvent.create({
    type: 'conversion',
    sessionId,
    userId: req?.user?._id,
    source: 'unknown',
    metadata: { conversionType, ...metadata }
  });
  const metric = await ensureDailyMetric(dateKey);
  metric.conversions = { ...emptyConversions(), ...(metric.conversions?.toObject?.() || metric.conversions || {}) };
  metric.conversions[key] = (metric.conversions[key] || 0) + 1;
  metric.synthetic = false;
  await metric.save();
  return { ok: true };
}

export async function getAdminAnalytics(range = '7d') {
  await ensureAnalyticsBackfill();
  const window = getRangeWindow(range);
  const startKey = utcDateKey(window.start);
  const endKey = utcDateKey(window.end);
  const metrics = await AnalyticsDailyMetric.find({ date: { $gte: startKey, $lte: endKey } }).sort({ date: 1 }).lean();
  const summary = buildAnalyticsSummary(metrics);
  const latestReport = await AnalyticsAiReport.findOne({ range: window.range }).sort({ createdAt: -1 }).lean();
  return { range: window.range, startDate: startKey, endDate: endKey, summary, latestReport };
}

function parseGeminiJson(text) {
  const trimmed = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return {
      overview: trimmed || 'Gemini không trả về nội dung phân tích.',
      technical: [],
      behaviour: [],
      traffic: [],
      conversions: [],
      risks: [],
      recommendations: []
    };
  }
}

export async function generateAnalyticsAiReport(user, range = '7d') {
  const dateKey = dayKeyInVietnam(new Date());
  const usage = await AnalyticsAiUsage.findOneAndUpdate(
    { userId: user._id, date: dateKey },
    { $setOnInsert: { userId: user._id, date: dateKey, count: 0 } },
    { upsert: true, new: true }
  );
  const quota = getAiQuotaState(usage.count);
  if (!quota.allowed) throw new ApiError(429, 'Đã hết 3 lượt AI phân tích trong ngày.');
  const analytics = await getAdminAnalytics(range);
  if (!env.gemini.apiKey || !env.gemini.model) {
    throw new ApiError(503, 'Gemini chưa được cấu hình. Vui lòng kiểm tra GEMINI_API_KEY và GEMINI_MODEL.');
  }

  const prompt = [
    'Ban la chuyen gia phan tich san pham cho marketplace VESD.',
    'Hay tra ve JSON hop le voi cac key: overview, technical, behaviour, traffic, conversions, risks, recommendations.',
    'Moi key ngoai overview la mang cac cau ngan bang tieng Viet, co so lieu cu the khi co the.',
    `Du lieu analytics (${analytics.range}) la: ${JSON.stringify(analytics.summary)}`
  ].join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.gemini.model)}:generateContent?key=${encodeURIComponent(env.gemini.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!response.ok) throw new ApiError(502, 'Gemini không phản hồi thành công.');
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
  usage.count += 1;
  await usage.save();
  const report = await AnalyticsAiReport.create({
    userId: user._id,
    date: dateKey,
    range: analytics.range,
    quotaUsed: usage.count,
    report: parseGeminiJson(text),
    snapshot: analytics.summary
  });
  return { report, quota: getAiQuotaState(usage.count) };
}

export async function getAnalyticsAiQuota(user) {
  const dateKey = dayKeyInVietnam(new Date());
  const usage = await AnalyticsAiUsage.findOne({ userId: user._id, date: dateKey }).lean();
  return getAiQuotaState(usage?.count || 0);
}
