declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

const isGAEnabled = !!GA_MEASUREMENT_ID;

function gtag(...args: unknown[]) {
  if (isGAEnabled && window.gtag) {
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
