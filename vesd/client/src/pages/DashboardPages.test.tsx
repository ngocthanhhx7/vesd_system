import { describe, expect, it } from 'vitest';
import { DesignerCard, getHomeDesignerPageItems } from './PublicPages';
import { ProjectCard } from './DashboardPages';

describe('component contracts', () => {
  it('DesignerCard exists', () => {
    expect(typeof DesignerCard).toBe('function');
  });
  it('ProjectCard exists', () => {
    expect(typeof ProjectCard).toBe('function');
  });
  it('builds compact home designer pagination', () => {
    expect(getHomeDesignerPageItems(1, 7)).toEqual([1, 2, 3, 'ellipsis', 7]);
    expect(getHomeDesignerPageItems(5, 7)).toEqual([1, 'ellipsis', 4, 5, 6, 7]);
  });
});
