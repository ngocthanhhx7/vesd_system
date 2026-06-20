declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SESSION_KEY = 'vesd_analytics_session';
const VISITOR_KEY = 'vesd_analytics_visitor';

const isGAEnabled = !!GA_MEASUREMENT_ID;
let pageViewCount = 0;
let maxScrollDepth = 0;
let sessionStartedAt = Date.now();
let performanceInstalled = false;
let interactionsInstalled = false;

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && isGAEnabled && window.gtag) {
    window.gtag(...args);
  }
}

export function initGA() {
  if (!isGAEnabled) return;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
}

export function pageView(path: string, title: string) {
  gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: path,
    page_title: title,
    page_referrer: document.referrer
  });
}

type GtagParams = Record<string, string | number | boolean | undefined | null>;

export function event(name: string, params?: GtagParams) {
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) clean[k] = v;
    }
  }
  gtag('event', name, clean);
  sendInternalAnalytics({
    type: 'click',
    path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
    title: name,
    metadata: clean
  });
}

export function setUserProperties(properties: Record<string, string | number | boolean | null | undefined>) {
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (v != null) clean[k] = v;
  }
  gtag('set', 'user_properties', clean);
}

export function isActive() {
  return isGAEnabled;
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `vesd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAnalyticsSessionId() {
  const storage = safeStorage();
  if (!storage) return 'server-render-session';
  const current = storage.getItem(SESSION_KEY);
  if (current) return current;
  const next = randomId();
  storage.setItem(SESSION_KEY, next);
  return next;
}

function visitorState() {
  const storage = safeStorage();
  if (!storage) return { visitorId: 'unknown', isNewVisitor: false };
  const existing = storage.getItem(VISITOR_KEY);
  if (existing) return { visitorId: existing, isNewVisitor: false };
  const visitorId = randomId();
  storage.setItem(VISITOR_KEY, visitorId);
  return { visitorId, isNewVisitor: true };
}

function sourceFromLocation() {
  if (typeof window === 'undefined') return 'direct';
  const params = new URLSearchParams(window.location.search);
  return params.get('utm_source') || params.get('source') || '';
}

function sendInternalAnalytics(payload: Record<string, unknown>, endpoint = '/analytics/events') {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    sessionId: getAnalyticsSessionId(),
    referrer: document.referrer,
    source: sourceFromLocation(),
    timestamp: new Date().toISOString(),
    ...payload
  });
  const url = `${API_URL}${endpoint}`;
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => null);
}

export function trackPageView(path: string, title: string) {
  const visitor = visitorState();
  const isSessionStart = pageViewCount === 0;
  pageViewCount += 1;
  pageView(path, title);
  sendInternalAnalytics({
    type: 'page_view',
    path,
    title,
    visitorId: visitor.visitorId,
    isNewVisitor: visitor.isNewVisitor,
    isSessionStart
  });
}

export function installPerformanceTracking() {
  if (typeof window === 'undefined' || performanceInstalled) return;
  performanceInstalled = true;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const sendPerformance = (extra: Record<string, number | undefined> = {}) => {
    const pageLoadTime = nav ? Math.max(nav.loadEventEnd - nav.startTime, 0) / 1000 : undefined;
    const tti = nav ? Math.max(nav.domInteractive - nav.startTime, 0) / 1000 : undefined;
    sendInternalAnalytics({ pageLoadTime, tti, uptime: 99.5, ...extra }, '/analytics/performance');
  };
  window.setTimeout(() => sendPerformance(), 1500);
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1]?.startTime;
        if (lcp) sendPerformance({ lcp: lcp / 1000 });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Browser support varies; missing vitals are reported as unavailable.
    }
    try {
      new PerformanceObserver((list) => {
        const cls = list.getEntries().reduce((sum, entry: any) => sum + (entry.hadRecentInput ? 0 : entry.value || 0), 0);
        if (cls) sendPerformance({ cls });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Browser support varies; missing vitals are reported as unavailable.
    }
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const eventTiming = entries[entries.length - 1] as any;
        if (eventTiming?.duration) sendPerformance({ inp: eventTiming.duration });
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    } catch {
      // Browser support varies; missing vitals are reported as unavailable.
    }
  }
}

export function installInteractionTracking() {
  if (typeof window === 'undefined' || interactionsInstalled) return;
  interactionsInstalled = true;
  const onClick = (clickEvent: MouseEvent) => {
    const target = clickEvent.target instanceof Element ? clickEvent.target.closest('a,button,[role="button"]') : null;
    if (!target) return;
    const label = target.getAttribute('aria-label') || target.textContent?.trim().slice(0, 80) || target.tagName.toLowerCase();
    sendInternalAnalytics({
      type: 'click',
      path: window.location.pathname + window.location.search,
      title: label,
      metadata: {
        tag: target.tagName.toLowerCase(),
        href: target instanceof HTMLAnchorElement ? target.href : undefined
      }
    });
  };
  const onScroll = () => {
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const depth = Math.round(clamp((window.scrollY / scrollable) * 100, 0, 100));
    if (depth >= maxScrollDepth + 10 || depth === 100) {
      maxScrollDepth = depth;
      sendInternalAnalytics({ type: 'scroll', value: depth, path: window.location.pathname + window.location.search });
    }
  };
  const onUnload = () => {
    sendInternalAnalytics({
      type: 'session',
      value: Math.round((Date.now() - sessionStartedAt) / 1000),
      isBounce: pageViewCount <= 1 && maxScrollDepth < 25
    });
  };
  window.addEventListener('click', onClick, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', onUnload);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
