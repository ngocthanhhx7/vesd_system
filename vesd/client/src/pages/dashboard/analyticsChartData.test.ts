import { describe, expect, it } from 'vitest';
import {
  RANGE_OPTIONS,
  formatVietnameseDate,
  normaliseAnalyticsSeries,
  toFunnelChartData,
  toSourceChartData
} from './analyticsChartData';

describe('analytics chart data', () => {
  it('exposes the supported ranges with Vietnamese labels', () => {
    expect(RANGE_OPTIONS).toEqual([
      { value: '1d', label: 'Hôm nay' },
      { value: '7d', label: '7 ngày' },
      { value: '30d', label: '30 ngày' },
      { value: 'all', label: 'Toàn bộ' }
    ]);
  });

  it('formats chart dates in Vietnamese', () => {
    expect(formatVietnameseDate('2026-07-20')).toBe('20/07');
    expect(formatVietnameseDate('not-a-date')).toBe('—');
  });

  it('normalises non-finite series metrics before charting', () => {
    expect(normaliseAnalyticsSeries([
      { date: '2026-07-20', sessions: 12, users: Number.NaN, pageViews: Infinity, bounceRate: '43.5' }
    ])).toEqual([
      { date: '2026-07-20', label: '20/07', sessions: 12, users: 0, pageViews: 0, bounceRate: 43.5 }
    ]);
  });

  it('sorts source rows by descending volume and derives their percentages', () => {
    expect(toSourceChartData({ social: 25, direct: 60, search: Number.NaN, email: 15 })).toEqual([
      expect.objectContaining({ source: 'direct', label: 'Direct', value: 60, percent: 60 }),
      expect.objectContaining({ source: 'social', label: 'Social', value: 25, percent: 25 }),
      expect.objectContaining({ source: 'email', label: 'Email', value: 15, percent: 15 }),
      expect.objectContaining({ source: 'search', label: 'Search', value: 0, percent: 0 })
    ]);
  });

  it('keeps the funnel order and calculates each step against the first step', () => {
    expect(toFunnelChartData({
      registrations: 100,
      contacts: 55,
      projectsCreated: 20,
      escrowPaid: 8,
      premiumSubscriptions: 3
    })).toEqual([
      expect.objectContaining({ key: 'registrations', label: 'Đăng ký', value: 100, percentOfFirst: 100 }),
      expect.objectContaining({ key: 'contacts', label: 'Liên hệ designer', value: 55, percentOfFirst: 55 }),
      expect.objectContaining({ key: 'projectsCreated', label: 'Tạo dự án', value: 20, percentOfFirst: 20 }),
      expect.objectContaining({ key: 'escrowPaid', label: 'Escrow', value: 8, percentOfFirst: 8 }),
      expect.objectContaining({ key: 'premiumSubscriptions', label: 'Premium', value: 3, percentOfFirst: 3 })
    ]);
  });
});
