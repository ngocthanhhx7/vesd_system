// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PublicHeader } from './PublicHeader';
import { desktopHotMenuColumns } from './publicNavigation';

const mockedAuth = vi.hoisted(() => ({ user: null as { name: string; avatar?: string; roles: string[] } | null }));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockedAuth.user, logout: vi.fn() })
}));

const expectedDesktopColumns = [
  {
    title: 'Thiết kế thương hiệu (Branding)',
    items: [
      { label: 'Thiết kế Logo', slug: 'thiet-ke-logo' },
      { label: 'Thiết kế Brand Identity', slug: 'bo-nhan-dien-thuong-hieu' },
      { label: 'Thiết kế Brand Guidelines', slug: 'quy-chuan-thuong-hieu' },
      { label: 'Thiết kế Logo animation', slug: 'hoat-anh-logo' },
      { label: 'Thiết kế Business card', slug: 'danh-thiep' },
      { label: 'Thiết kế Brand kit', slug: 'bo-tai-san-thuong-hieu' },
      { label: 'Thiết kế Letterhead', slug: 'tieu-de-thu' }
    ],
    secondary: {
      title: 'Khác',
      items: [
        { label: 'Khám phá thêm', slug: 'kham-pha-them' },
        { label: 'Yêu cầu thêm danh mục', slug: 'yeu-cau-them-danh-muc' }
      ]
    }
  },
  {
    title: 'Thiết kế UI / UX',
    items: [
      { label: 'Thiết kế Website UI', slug: 'thiet-ke-giao-dien-website' },
      { label: 'Thiết kế Mobile App UI', slug: 'thiet-ke-giao-dien-ung-dung' },
      { label: 'Thiết kế Landing Page', slug: 'thiet-ke-landing-page' },
      { label: 'Thiết kế Dashboard / SaaS', slug: 'thiet-ke-dashboard-saas' },
      { label: 'Thiết kế Design System', slug: 'thiet-ke-he-thong-giao-dien' },
      { label: 'Wireframe', slug: 'wireframe' }
    ]
  },
  {
    title: 'Thiết kế đồ họa (Graphic Design)',
    items: [
      { label: 'Poster', slug: 'poster' },
      { label: 'Banner quảng cáo', slug: 'banner-quang-cao' },
      { label: 'Infographic', slug: 'infographic' },
      { label: 'Brochure', slug: 'brochure' },
      { label: 'Billboard quảng cáo', slug: 'billboard-quang-cao' },
      { label: 'Social media post', slug: 'bai-dang-mang-xa-hoi' }
    ]
  },
  {
    title: 'Thiết kế 3D',
    items: [
      { label: 'Thiết kế 3D', slug: 'thiet-ke-3d' },
      { label: '3D Product Render', slug: 'render-san-pham-3d' },
      { label: '3D Game Asset', slug: 'asset-game-3d' }
    ]
  }
];

function renderHeader(user: typeof mockedAuth.user = null) {
  mockedAuth.user = user;
  return render(
    <MemoryRouter>
      <PublicHeader />
      <LocationProbe />
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}</output>;
}

afterEach(() => {
  mockedAuth.user = null;
  cleanup();
});

describe('PublicHeader', () => {
  test('defines exactly the specified desktop columns, labels, and slugs', () => {
    expect(desktopHotMenuColumns).toEqual(expectedDesktopColumns);
  });

  test('renders the desktop hot-menu trigger as Đang Hot', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Đang Hot' })).toBeTruthy();
  });

  test('renders all desktop menu links using their explicit service slugs', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Đang Hot' }));

    const menu = screen.getByRole('region', { name: 'Đang Hot' });
    expect(menu.querySelectorAll('[data-hot-menu-column]')).toHaveLength(4);
    expect(menu.querySelectorAll('h3')).toHaveLength(5);
    for (const column of expectedDesktopColumns) {
      for (const item of [...column.items, ...(column.secondary?.items ?? [])]) {
        expect(screen.getByRole('link', { name: item.label }).getAttribute('href')).toBe(`/services/${item.slug}`);
      }
    }
  });

  test('uses the approved full-width panel and four-column visual hooks', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Đang Hot' }));

    const panel = screen.getByRole('region', { name: 'Đang Hot' });
    expect(panel.classList.contains('public-hot-menu-panel')).toBe(true);
    expect(panel.querySelector('.public-hot-menu-grid')).not.toBeNull();
  });

  test.each(['Thiết kế Website UI', 'Khám phá thêm'])('closes the desktop menu after selecting %s', async (linkName) => {
    const user = userEvent.setup();
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Đang Hot' });

    await user.click(trigger);
    const link = screen.getByRole('link', { name: linkName });
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    await user.click(link);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test.each([
    ['guest', null, '/register', '/register'],
    ['designer', { name: 'Designer', roles: ['designer'] }, '/designer/jobs', '/designer/projects'],
    ['client', { name: 'Client', roles: ['client'] }, '/client', '/client/projects'],
    ['admin', { name: 'Admin', roles: ['admin'] }, '/admin', '/client/create-project']
  ])('preserves public job and project routes for %s', (_role, authUser, jobsPath, projectsPath) => {
    renderHeader(authUser);

    expect(screen.getByRole('link', { name: 'Tìm việc' }).getAttribute('href')).toBe(jobsPath);
    expect(screen.getByRole('link', { name: 'Dự án' }).getAttribute('href')).toBe(projectsPath);
  });

  test('opens from focus or click and Escape returns focus without suppressing a later focus', async () => {
    const user = userEvent.setup();
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Đang Hot' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe('public-hot-menu');

    trigger.focus();
    fireEvent.focus(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await user.keyboard('{Escape}');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    fireEvent.blur(trigger, { relatedTarget: document.body });
    fireEvent.focus(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('keeps the menu open while pointer moves from the trigger toward its panel', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Đang Hot' });
    const hotMenuArea = trigger.parentElement as HTMLElement;

    fireEvent.mouseEnter(hotMenuArea);
    const panel = screen.getByRole('region', { name: 'Đang Hot' });
    fireEvent.mouseLeave(hotMenuArea, { relatedTarget: panel });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('closes when focus leaves the combined trigger and panel area', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Đang Hot' });
    const hotMenuArea = trigger.parentElement as HTMLElement;
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focus(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.blur(hotMenuArea, { relatedTarget: outside });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    outside.remove();
  });

  test.each([
    ['guest', null, '/login', '/login'],
    ['designer', { name: 'Designer', roles: ['designer'] }, '/designer/messages', '/designer'],
    ['client', { name: 'Client', roles: ['client'] }, '/client/messages', '/client'],
    ['admin', { name: 'Admin', roles: ['admin'] }, '/admin', '/admin']
  ])('preserves mobile menu, message, and account routes for %s', async (_role, authUser, messagesPath, accountPath) => {
    const user = userEvent.setup();
    renderHeader(authUser);

    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    expect(screen.getByText('Đang Hot', { selector: 'p' })).toBeTruthy();
    const messageButtons = screen.getAllByRole('button', { name: 'Tin nhắn' });
    await user.click(messageButtons[messageButtons.length - 1]);
    expect(screen.getByTestId('current-location').textContent).toBe(messagesPath);

    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    const accountButtons = screen.getAllByRole('button', { name: authUser ? 'Tài khoản' : 'Đăng nhập' });
    await user.click(accountButtons[accountButtons.length - 1]);
    expect(screen.getByTestId('current-location').textContent).toBe(accountPath);
  });
});
