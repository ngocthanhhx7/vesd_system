import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignerCard, DesignerProfilePage, getHomeDesignerPageItems } from './PublicPages';
import { AdminAnalyticsPage, ProjectCard } from './DashboardPages';
import { boundedPercent, buildLinePoints, chartState, formatDuration } from './dashboard/AdminAnalyticsPage';
import { projectWorkflowRefreshKeys } from './dashboard/ProjectWorkflowPages';
import { Metric } from './dashboard/shared/Metric';
import { getOrCreateAnalyticsSession } from '../services/analytics';
import { AuthProvider } from '../hooks/useAuth';

function renderDesignerProfile() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['designer', 'khang'], {
    profile: {
      _id: 'designer-profile-1',
      userId: { _id: 'designer-1', name: 'Khang', avatar: '/avatar.png' },
      title: 'Brand Designer',
      categories: ['brand-identity'],
      skills: ['Branding'],
      startingPrice: 1_000_000,
      socialLinks: {
        facebook: 'https://facebook.com/khang',
        linkedin: 'https://linkedin.com/in/khang',
        twitter: 'https://x.com/khang',
        tiktok: 'https://tiktok.com/@khang'
      }
    },
    portfolio: [],
    reviews: []
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { href: 'http://localhost/designers/khang' } }
  });

  return renderToStaticMarkup(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/designers/khang']}>
            <Routes>
              <Route path="/designers/:slug" element={<DesignerProfilePage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('component contracts', () => {
  it('DesignerCard exists', () => {
    expect(typeof DesignerCard).toBe('function');
  });
  it('does not render social link icons on public designer profiles', () => {
    const html = renderDesignerProfile();

    expect(html).not.toContain('title="Facebook"');
    expect(html).not.toContain('title="LinkedIn"');
    expect(html).not.toContain('title="Twitter"');
    expect(html).not.toContain('title="TikTok"');
  });
  it('ProjectCard exists', () => {
    expect(typeof ProjectCard).toBe('function');
  });
  it('AdminAnalyticsPage exists', () => {
    expect(typeof AdminAnalyticsPage).toBe('function');
  });
  it('builds compact home designer pagination', () => {
    expect(getHomeDesignerPageItems(1, 7)).toEqual([1, 2, 3, 'ellipsis', 7]);
    expect(getHomeDesignerPageItems(5, 7)).toEqual([1, 'ellipsis', 4, 5, 6, 7]);
  });
  it('builds line chart points without NaN for empty or flat data', () => {
    expect(buildLinePoints([], 'sessions')).toBe('');
    expect(buildLinePoints([{ sessions: 10 }, { sessions: 10 }], 'sessions')).toBe('0,50 100,50');
  });
  it('describes empty and single-point chart states', () => {
    expect(chartState([], 'sessions')).toEqual({ kind: 'empty', value: 0 });
    expect(chartState([{ sessions: 10 }], 'sessions')).toEqual({ kind: 'single', value: 10 });
    expect(chartState([{ sessions: 10 }, { sessions: 12 }], 'sessions')).toEqual({ kind: 'line', value: 12 });
  });
  it('formats session duration as minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(125)).toBe('2m 5s');
  });
  it('bounds progress percentages for display', () => {
    expect(boundedPercent(-10)).toBe(0);
    expect(boundedPercent(58.6)).toBe(58.6);
    expect(boundedPercent(858.91)).toBe(100);
  });
  it('refreshes money data after project workflow mutations', () => {
    expect(projectWorkflowRefreshKeys('project-1')).toContainEqual(['wallet']);
    expect(projectWorkflowRefreshKeys('project-1')).toContainEqual(['tx']);
    expect(projectWorkflowRefreshKeys('project-1')).toContainEqual(['dashboard-summary']);
    expect(projectWorkflowRefreshKeys('project-1')).toContainEqual(['project', 'project-1']);
  });
  it('renders an optional metric description below the value', () => {
    const Icon = () => null;
    const html = renderToStaticMarkup(
      <Metric label="Doanh thu" value="8.000.000đ" description="Phí nền tảng: 400.000đ" icon={Icon} />
    );
    expect(html).toContain('8.000.000đ');
    expect(html).toContain('Phí nền tảng: 400.000đ');
  });
  it('keeps the same analytics session across reloads within 30 minutes', () => {
    const storage = new Map<string, string>();
    const store = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => { storage.set(key, value); }
    };
    const first = getOrCreateAnalyticsSession({ now: 1000, storage: store, makeId: () => 'session-a' });
    const second = getOrCreateAnalyticsSession({ now: 1000 + 10 * 60 * 1000, storage: store, makeId: () => 'session-b' });
    expect(first.isSessionStart).toBe(true);
    expect(second.sessionId).toBe('session-a');
    expect(second.isSessionStart).toBe(false);
  });
  it('starts a new analytics session after 30 minutes of inactivity', () => {
    const storage = new Map<string, string>();
    const store = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => { storage.set(key, value); }
    };
    getOrCreateAnalyticsSession({ now: 1000, storage: store, makeId: () => 'session-a' });
    const next = getOrCreateAnalyticsSession({ now: 1000 + 31 * 60 * 1000, storage: store, makeId: () => 'session-b' });
    expect(next.sessionId).toBe('session-b');
    expect(next.isSessionStart).toBe(true);
  });
});
