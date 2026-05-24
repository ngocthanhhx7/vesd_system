import {
  LayoutDashboard,
  FolderPlus,
  Wallet,
  Crown,
  Settings,
  UserCircle,
  Briefcase,
  Inbox,
  MessageCircle,
  BadgeDollarSign,
  Users,
  ShieldCheck,
  FolderKanban,
  Lock,
  ArrowDownToLine,
  AlertTriangle,
  Star,
  ListChecks,
  TicketPercent,
  type LucideIcon
} from 'lucide-react';

export type DashboardRole = 'client' | 'designer' | 'admin';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

export const dashboardNav: Record<DashboardRole, NavGroup[]> = {
  client: [
    {
      items: [
        { href: '/client', label: 'Tổng quan', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Dự án',
      items: [
        { href: '/client/projects', label: 'Dự án của tôi', icon: FolderKanban },
        { href: '/client/create-project', label: 'Đăng dự án', icon: FolderPlus },
        { href: '/client/messages', label: 'Tin nhắn', icon: MessageCircle },
      ]
    },
    {
      title: 'Tài chính',
      items: [
        { href: '/client/wallet', label: 'Ví tiền', icon: Wallet },
        { href: '/client/premium', label: 'Premium', icon: Crown },
      ]
    },
    {
      title: 'Tài khoản',
      items: [
        { href: '/client/settings', label: 'Cài đặt', icon: Settings },
      ]
    }
  ],
  designer: [
    {
      items: [
        { href: '/designer', label: 'Tổng quan', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Hồ sơ',
      items: [
        { href: '/designer/profile', label: 'Hồ sơ', icon: UserCircle },
        { href: '/designer/portfolio', label: 'Hồ sơ năng lực', icon: Briefcase },
      ]
    },
    {
      title: 'Công việc',
      items: [
        { href: '/designer/jobs', label: 'Tìm việc', icon: Briefcase },
        { href: '/designer/projects', label: 'Dự án của tôi', icon: FolderKanban },
        { href: '/designer/requests', label: 'Yêu cầu', icon: Inbox },
        { href: '/designer/messages', label: 'Tin nhắn', icon: MessageCircle },
      ]
    },
    {
      title: 'Tài chính',
      items: [
        { href: '/designer/earnings', label: 'Thu nhập', icon: BadgeDollarSign },
        { href: '/designer/premium', label: 'Premium', icon: Crown },
      ]
    },
    {
      title: 'Tài khoản',
      items: [
        { href: '/designer/settings', label: 'Cài đặt', icon: Settings },
      ]
    }
  ],
  admin: [
    {
      items: [
        { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Quản lý',
      items: [
        { href: '/admin/users', label: 'Người dùng', icon: Users },
        { href: '/admin/verification', label: 'Xác minh', icon: ShieldCheck },
        { href: '/admin/projects', label: 'Dự án', icon: FolderKanban },
      ]
    },
    {
      title: 'Tài chính',
      items: [
        { href: '/admin/escrow', label: 'Escrow', icon: Lock },
        { href: '/admin/withdrawals', label: 'Rút tiền', icon: ArrowDownToLine },
        { href: '/admin/discounts', label: 'Mã giảm giá', icon: TicketPercent },
      ]
    },
    {
      title: 'Hỗ trợ',
      items: [
        { href: '/admin/disputes', label: 'Khiếu nại', icon: AlertTriangle },
        { href: '/admin/reviews', label: 'Đánh giá', icon: Star },
        { href: '/admin/checklists', label: 'Checklist', icon: ListChecks },
        { href: '/admin/premium', label: 'Premium', icon: Crown },
      ]
    },
    {
      title: 'Tài khoản',
      items: [
        { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
      ]
    }
  ]
};

// Legacy flat format for DashboardHeader mobile menu
export const dashboardLinks: Record<DashboardRole, string[][]> = Object.fromEntries(
  Object.entries(dashboardNav).map(([role, groups]) => [
    role,
    groups.flatMap(g => g.items.map(i => [i.href, i.label]))
  ])
) as Record<DashboardRole, string[][]>;
