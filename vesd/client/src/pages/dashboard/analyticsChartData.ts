export type RangeKey = '1d' | '7d' | '30d' | 'all';

export type AnalyticsSeriesPoint = {
  date?: string;
  label?: string;
  [metric: string]: string | number | undefined;
};

export type TrafficSourceRow = {
  source: string;
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type FunnelChartRow = {
  key: keyof ConversionTotals;
  label: string;
  value: number;
  percentOfFirst: number;
};

export type ConversionTotals = {
  registrations?: unknown;
  contacts?: unknown;
  projectsCreated?: unknown;
  escrowPaid?: unknown;
  premiumSubscriptions?: unknown;
};

export const RANGE_OPTIONS: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: '1d', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Toàn bộ' }
];

const sourceLabels: Record<string, string> = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
  email: 'Email',
  paid: 'Paid',
  unknown: 'Unknown'
};

const sourceColors: Record<string, string> = {
  direct: '#2453D6',
  search: '#10b981',
  social: '#f59e0b',
  referral: '#8b5cf6',
  email: '#06b6d4',
  paid: '#ef4444',
  unknown: '#94a3b8'
};

const funnelSteps: ReadonlyArray<{ key: keyof ConversionTotals; label: string }> = [
  { key: 'registrations', label: 'Đăng ký' },
  { key: 'contacts', label: 'Liên hệ designer' },
  { key: 'projectsCreated', label: 'Tạo dự án' },
  { key: 'escrowPaid', label: 'Escrow' },
  { key: 'premiumSubscriptions', label: 'Premium' }
];

export function finiteNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function percentOf(value: number, total: number): number {
  return total ? Math.round((value / total) * 10_000) / 100 : 0;
}

export function formatVietnameseDate(date: unknown): string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) return '—';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return '—';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function normaliseAnalyticsSeries(series: AnalyticsSeriesPoint[] | undefined): AnalyticsSeriesPoint[] {
  return (series || []).map((point) => {
    const normalised: AnalyticsSeriesPoint = {
      date: point.date,
      label: formatVietnameseDate(point.date)
    };

    Object.entries(point).forEach(([key, value]) => {
      if (key !== 'date' && key !== 'label') normalised[key] = finiteNumber(value);
    });
    return normalised;
  });
}

export function toSourceChartData(sources: Record<string, unknown> | undefined): TrafficSourceRow[] {
  const rows = Object.entries(sources || {}).map(([source, rawValue]) => ({
    source,
    label: sourceLabels[source] || source,
    value: Math.max(finiteNumber(rawValue), 0),
    color: sourceColors[source] || sourceColors.unknown
  }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return rows
    .map((row) => ({ ...row, percent: percentOf(row.value, total) }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

export function toFunnelChartData(conversions: ConversionTotals | undefined): FunnelChartRow[] {
  const firstValue = Math.max(finiteNumber(conversions?.registrations), 0);
  return funnelSteps.map(({ key, label }) => {
    const value = Math.max(finiteNumber(conversions?.[key]), 0);
    return { key, label, value, percentOfFirst: percentOf(value, firstValue) };
  });
}
