import { describe, expect, it } from 'vitest';
import { DesignerCard } from './PublicPages';
import { ProjectCard } from './DashboardPages';

describe('component contracts', () => {
  it('DesignerCard exists', () => {
    expect(typeof DesignerCard).toBe('function');
  });
  it('ProjectCard exists', () => {
    expect(typeof ProjectCard).toBe('function');
  });
});

