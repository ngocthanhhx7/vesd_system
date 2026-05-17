export type DashboardRole = 'client' | 'designer' | 'admin';

export const dashboardLinks: Record<DashboardRole, string[][]> = {
  client: [
    ['/client', 'Tổng quan'],
    ['/client/create-project', 'Đăng dự án'],
    ['/client/wallet', 'Ví tiền'],
    ['/client/premium', 'Premium'],
    ['/client/settings', 'Cài đặt']
  ],
  designer: [
    ['/designer', 'Tổng quan'],
    ['/designer/profile', 'Hồ sơ'],
    ['/designer/portfolio', 'Portfolio'],
    ['/designer/requests', 'Yêu cầu'],
    ['/designer/earnings', 'Thu nhập'],
    ['/designer/premium', 'Premium']
  ],
  admin: [
    ['/admin', 'Tổng quan'],
    ['/admin/users', 'Users'],
    ['/admin/verification', 'Xác minh'],
    ['/admin/projects', 'Projects'],
    ['/admin/escrow', 'Escrow'],
    ['/admin/disputes', 'Disputes'],
    ['/admin/reviews', 'Reviews'],
    ['/admin/checklists', 'Checklist'],
    ['/admin/premium', 'Premium'],
    ['/admin/discounts', 'Mã giảm giá']
  ]
};
