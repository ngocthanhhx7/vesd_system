import { describe, expect, it } from 'vitest';
import { DesignerCard, getHomeDesignerPageItems } from './PublicPages';
import { AdminAnalyticsPage, ProjectCard } from './DashboardPages';
import { buildLinePoints, formatDuration } from './dashboard/AdminAnalyticsPage';

describe('component contracts', () => {
  it('DesignerCard exists', () => {
    expect(typeof DesignerCard).toBe('function');
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
  it('formats session duration as minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(125)).toBe('2m 5s');
  });
});
