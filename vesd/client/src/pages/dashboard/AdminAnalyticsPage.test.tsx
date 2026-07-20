// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';

const mockedApi = vi.hoisted(() => ({
  analytics: vi.fn(),
  backfill: vi.fn(),
  aiReport: vi.fn()
}));

vi.mock('../../services/api', () => ({
  endpoints: {
    adminAnalytics: mockedApi.analytics,
    adminAnalyticsBackfill: mockedApi.backfill,
    adminAnalyticsAiReport: mockedApi.aiReport
  }
}));

const response = {
  summary: {
    totals: { sessions: 0, users: 0, clicks: 0 },
    behaviour: { bounceRate: 0, scrollDepth: 0, averageSessionDuration: 0, pagesPerSession: 0, clickThroughRate: 0 },
    conversions: { rate: 0, registrations: 0, contacts: 0, projectsCreated: 0, escrowPaid: 0, premiumSubscriptions: 0 },
    traffic: { sources: {}, newVsReturning: { newUsers: 0, returningUsers: 0 } },
    technical: { uptime: 99.5, pageLoadTime: 0, tti: 0, fid: 0, inp: 0 },
    series: []
  }
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAnalyticsPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockedApi.analytics.mockReset().mockResolvedValue(response);
  mockedApi.backfill.mockReset().mockResolvedValue({});
  mockedApi.aiReport.mockReset().mockResolvedValue({});
});

afterEach(cleanup);

describe('AdminAnalyticsPage range filter', () => {
  it('loads seven days by default and refetches the selected 30-day range', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(mockedApi.analytics).toHaveBeenCalledWith('7d'));
    const thirtyDays = screen.getByRole('button', { name: '30 ngày' });
    expect(thirtyDays.getAttribute('aria-pressed')).toBe('false');

    await user.click(thirtyDays);

    await waitFor(() => expect(mockedApi.analytics).toHaveBeenCalledWith('30d'));
    expect(thirtyDays.getAttribute('aria-pressed')).toBe('true');
  });
});
