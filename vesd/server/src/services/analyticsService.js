import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import {
  AnalyticsAiReport,
  AnalyticsAiUsage,
  AnalyticsDailyMetric,
  AnalyticsEvent
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

export function buildFakeDailyMetric(date, index = 0) {
  const weekday = date.getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const trend = index * 7;
  const wave = Math.round(Math.sin(index / 2.2) * 8);
  const sessions = Math.max(42, Math.round(68 + trend + wave - (isWeekend ? 12 : 0)));
  const users = Math.round(sessions * (0.72 + ((index % 5) * 0.015)));
  const newUsers = Math.round(users * clamp(0.54 - index * 0.006, 0.34, 0.56));
  const returningUsers = Math.max(users - newUsers, 0);
  const pageViews = Math.round(sessions * (2.15 + (index % 4) * 0.18));
  const clicks = Math.round(pageViews * clamp(0.14 + index * 0.002, 0.12, 0.27));
  const bounces = Math.round(sessions * clamp(0.48 - index * 0.004 + (isWeekend ? 0.04 : 0), 0.27, 0.52));
  const registrations = Math.round(sessions * clamp(0.055 + index * 0.001, 0.05, 0.095));
  const contacts = Math.round(registrations * clamp(0.62 + index * 0.002, 0.55, 0.78));
  const projectsCreated = Math.round(contacts * clamp(0.48 + index * 0.001, 0.42, 0.62));
  const escrowPaid = Math.round(projectsCreated * clamp(0.42 + index * 0.001, 0.35, 0.54));
  const premiumSubscriptions = Math.max(0, Math.round(registrations * clamp(0.14 + index * 0.001, 0.1, 0.22)));
  const sourceBase = emptySources();
  sourceBase.direct = Math.round(sessions * 0.31);
  sourceBase.search = Math.round(sessions * 0.28);
  sourceBase.social = Math.round(sessions * 0.21);
  sourceBase.referral = Math.round(sessions * 0.11);
  sourceBase.email = Math.round(sessions * 0.05);
  sourceBase.paid = Math.round(sessions * 0.03);
  sourceBase.unknown = Math.max(0, sessions - Object.values(sourceBase).reduce((sum, value) => sum + value, 0));

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
    trafficSources: sourceBase,
    conversions: { registrations, contacts, projectsCreated, escrowPaid, premiumSubscriptions },
    technical: {
      pageLoadTime: round(clamp(2.55 - index * 0.018, 1.7, 2.65)),
      tti: round(clamp(3.45 - index * 0.02, 2.3, 3.55)),
      lcp: round(clamp(2.85 - index * 0.016, 1.95, 2.9)),
      fid: Math.round(clamp(48 - index * 0.6, 25, 55)),
      inp: Math.round(clamp(232 - index * 2.5, 145, 240)),
      cls: round(clamp(0.11 - index * 0.002, 0.045, 0.12), 3),
      uptime: round(clamp(99.18 + index * 0.018, 99.1, 99.92))
    },
    synthetic: true
  };
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
      scrollDepth: round(scrollDepthTotal / Math.max(sessions, 1))
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
  const existing = await AnalyticsDailyMetric.estimatedDocumentCount();
  if (existing > 0) return { inserted: 0 };
  const start = dateFromKey(ANALYTICS_START_DATE);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const docs = [];
  for (let cursor = new Date(start), index = 0; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1), index += 1) {
    docs.push(buildFakeDailyMetric(new Date(cursor), index));
  }
  if (docs.length) await AnalyticsDailyMetric.insertMany(docs, { ordered: false });
  return { inserted: docs.length };
}

export async function recordAnalyticsEvent(payload = {}, req = {}) {
  const type = ['page_view', 'click', 'scroll', 'session', 'performance', 'conversion'].includes(payload.type) ? payload.type : 'click';
  const sessionId = String(payload.sessionId || req.get?.('X-Analytics-Session-ID') || '').slice(0, 128);
  const dateKey = dayKeyInVietnam(payload.timestamp ? new Date(payload.timestamp) : new Date());
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
    metric.sessions += payload.isSessionStart ? 1 : 0;
    metric.users += payload.isSessionStart ? 1 : 0;
    metric.newUsers += payload.isNewVisitor && payload.isSessionStart ? 1 : 0;
    metric.returningUsers += !payload.isNewVisitor && payload.isSessionStart ? 1 : 0;
    metric.pageViews += 1;
    metric.trafficSources[source] = (metric.trafficSources[source] || 0) + (payload.isSessionStart ? 1 : 0);
  }
  if (type === 'click') metric.clicks += 1;
  if (type === 'scroll') {
    const sessions = Math.max(metric.sessions, 1);
    metric.scrollDepthTotal = Math.round(((metric.scrollDepthTotal || 0) + clamp(Number(payload.value) || 0, 0, 100)) / (metric.scrollDepthEvents + 1) * sessions);
    metric.scrollDepthEvents += 1;
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
      overview: trimmed || 'Gemini khong tra ve noi dung phan tich.',
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
  if (!quota.allowed) throw new ApiError(429, 'Da het 3 luot AI phan tich trong ngay.');
  const analytics = await getAdminAnalytics(range);
  if (!env.gemini.apiKey || !env.gemini.model) {
    throw new ApiError(503, 'Gemini chua duoc cau hinh. Vui long kiem tra GEMINI_API_KEY va GEMINI_MODEL.');
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
  if (!response.ok) throw new ApiError(502, 'Gemini khong phan hoi thanh cong.');
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
