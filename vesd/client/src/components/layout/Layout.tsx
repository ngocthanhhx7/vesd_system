import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Facebook, Instagram, LayoutDashboard, Linkedin, LogOut, Mail, Menu, Search, UserRound, Youtube } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

const hotMenu = [
  {
    title: 'Thiết kế thương hiệu (Branding)',
    items: ['Thiết kế Logo', 'Thiết kế Brand Identity', 'Thiết kế Brand Guidelines', 'Thiết kế Logo animation', 'Thiết kế Business card', 'Thiết kế Brand kit', 'Thiết kế Letterhead']
  },
  {
    title: 'Thiết kế UI / UX',
    items: ['Thiết kế Website UI', 'Thiết kế Mobile App UI', 'Thiết kế Landing Page', 'Thiết kế Dashboard / Saas', 'Thiết kế Design System', 'Wireframe']
  },
  {
    title: 'AI & công nghệ mới',
    items: ['AI generated art', 'AI avatar', 'AI image editing']
  },
  {
    title: 'Thiết kế 3D',
    items: ['Thiết kế 3D', '3D Product Render', '3D Game Asset']
  },
  {
    title: 'Thiết kế đồ họa (Graphic Design)',
    items: ['Poster', 'Banner quảng cáo', 'Infographic', 'Brochure', 'Billboard quảng cáo', 'Social media post']
  },
  {
    title: 'Illustration & Nghệ thuật',
    items: ['Illustration', 'Character Design', 'Concept Art', 'Game Art', 'Truyện tranh / Manga', 'NFT Art']
  },
  {
    title: 'Motion',
    items: ['Motion Graphic', 'Phim hoạt hình', 'Animation 2D', 'Animation 3D']
  },
  {
    title: 'Khác',
    items: ['Khám phá thêm', 'Yêu cầu thêm danh mục']
  }
];

export function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-secondary text-white shadow-sm">
        <div className="container-page flex h-[70px] items-center justify-between gap-4">
          <Link to="/" className="flex h-full items-center">
            <img src="/assets/vesd-logo-header-white.svg" alt="VESD" className="h-[25px] w-auto" />
          </Link>
          <nav className="hidden h-full items-center gap-16 text-base font-medium tracking-wide md:flex">
            <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/designers">Thuê Freelancer</NavLink>
            <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/register">Tìm việc</NavLink>
            <div className="group flex h-full items-center">
              <button className="flex items-center gap-2 text-white/95 hover:text-white">
                Danh mục <ChevronDown size={22} />
              </button>
              <div className="invisible absolute left-1/2 top-[70px] w-[min(1176px,calc(100vw-32px))] -translate-x-1/2 border border-blue-100 bg-white px-[96px] py-8 text-ink opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-4 gap-x-[92px] gap-y-11">
                  {hotMenu.map((group) => (
                    <div key={group.title}>
                      <h3 className="mb-3 text-base font-bold leading-snug text-brand">{group.title}</h3>
                      <ul className="space-y-2 text-base leading-6 text-ink">
                        {group.items.map((item) => (
                          <li key={item}>
                            <Link className="hover:text-brand" to={`/services/${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}>{item}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/client/create-project">Dự án</NavLink>
          </nav>
          <div className="flex items-center gap-6">
            <button aria-label="Tìm kiếm" className="text-white/95 hover:text-white"><Search size={24} /></button>
            <button aria-label="Tin nhắn" className="hidden text-white/95 hover:text-white sm:block"><Mail size={23} /></button>
            <button aria-label={user ? 'Dashboard' : 'Đăng nhập'} className="text-white/95 hover:text-white" onClick={() => navigate(user ? (user.roles.includes('admin') ? '/admin' : user.roles.includes('designer') ? '/designer' : '/client') : '/login')}>
              <UserRound size={24} />
            </button>
            {user && <button aria-label="Đăng xuất" className="hidden text-white/80 hover:text-white sm:block" onClick={logout}><LogOut size={20} /></button>}
            <Menu className="md:hidden" size={24} />
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="rounded-t-[36px] bg-secondary py-16 text-white md:py-20">
        <div className="container-page grid gap-10 md:grid-cols-5">
          <FooterColumn title="Dành cho Freelancer" items={['Cách thuê Freelancer', 'Tìm Freelancer', 'Các top nhận việc']} />
          <FooterColumn title="Dành cho Freelancer" items={['Cách tìm việc', 'Việc làm Freelancer mới nhất', 'Tạo hồ sơ Freelancer', 'Gửi proposal cho dự án', 'Freelancer Plus', 'Tips kiếm khách hàng']} />
          <FooterColumn title="Tài nguyên" items={['Trung tâm trợ giúp', 'Blog Freelancer', 'Tài nguyên học tập', 'Công cụ miễn phí cho doanh nghiệp', 'Câu chuyện thành công']} />
          <FooterColumn title="Công ty" items={['Về chúng tôi', 'Tuyển dụng', 'Đầu tư', 'Đối tác', 'Liên hệ', 'Bảo mật & an toàn', 'Điều khoản dịch vụ']} />
          <div>
            <h3 className="text-base font-bold">Theo dõi chúng tôi</h3>
            <div className="mt-5 flex gap-5"><Instagram size={19} /><Facebook size={18} /><Youtube size={21} /><Linkedin size={18} /></div>
            <h3 className="mt-14 text-base font-bold">Mobile app</h3>
            <div className="mt-5 space-y-3 text-base text-soft"><a className="block underline" href="#">Android</a><a className="block underline" href="#">iOS</a></div>
          </div>
        </div>
        <div className="container-page mt-20">
          <img src="/assets/vesd-logo-white.svg" alt="VESD" className="mx-auto h-auto w-[min(760px,92%)]" />
          <div className="mt-12 flex flex-col justify-between gap-4 text-base text-soft md:flex-row">
            <p>© 2026 - Bản quyền thuộc Six Sense Startup</p>
            <p>English&nbsp; | &nbsp;<strong className="text-white">Tiếng Việt</strong></p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const dashboardLinks = {
  client: [['/client', 'Tổng quan'], ['/client/create-project', 'Đăng dự án'], ['/client/wallet', 'Ví tiền'], ['/client/settings', 'Cài đặt']],
  designer: [['/designer', 'Tổng quan'], ['/designer/profile', 'Hồ sơ'], ['/designer/portfolio', 'Portfolio'], ['/designer/requests', 'Yêu cầu'], ['/designer/earnings', 'Thu nhập'], ['/designer/premium', 'Premium']],
  admin: [['/admin', 'Tổng quan'], ['/admin/users', 'Users'], ['/admin/verification', 'Xác minh'], ['/admin/projects', 'Projects'], ['/admin/escrow', 'Escrow'], ['/admin/disputes', 'Disputes'], ['/admin/reviews', 'Reviews'], ['/admin/checklists', 'Checklist'], ['/admin/premium', 'Premium']]
};

export function DashboardLayout({ role }: { role: 'client' | 'designer' | 'admin' }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-soft">
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-line bg-white p-5 lg:block">
        <Link to="/" className="flex items-center"><img src="/assets/vesd-logo-blue.svg" alt="VESD" className="h-10 w-auto" /></Link>
        <nav className="mt-8 space-y-1">
          {dashboardLinks[role].map(([href, label]) => (
            <NavLink key={href} to={href} end className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold ${isActive ? 'bg-soft text-brand' : 'text-muted hover:bg-soft'}`}>
              <LayoutDashboard size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-blue-100 bg-white">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-2 text-base text-muted"><Search size={17} /> Tìm project, designer, giao dịch</div>
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <div className="hidden text-right text-base sm:block"><div className="font-semibold">{user?.name}</div><div className="text-muted">{role}</div></div>
              <UserRound size={24} />
              <Button variant="ghost" onClick={logout}><LogOut size={16} /></Button>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-base font-bold leading-tight">{title}</h3>
      <ul className="mt-6 space-y-4 text-base text-soft">
        {items.map((item) => <li key={item}><Link className="hover:text-white" to="/designers">{item}</Link></li>)}
      </ul>
    </div>
  );
}

export function Protected({ role }: { role?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Đang tải...</div>;
  if (!user) return <div className="p-8">Vui lòng đăng nhập để tiếp tục.</div>;
  if (role && !user.roles.includes(role)) return <div className="p-8">Bạn không có quyền truy cập trang này.</div>;
  return <Outlet />;
}
