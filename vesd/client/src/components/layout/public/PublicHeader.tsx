import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Mail, Menu, Search, UserRound } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { hotMenu, serviceSlug } from './publicNavigation';

export function PublicHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex h-full items-center">
          <img src="/assets/vesd-logo-header-white.svg" alt="VESD" className="h-[33px] w-auto" />
        </Link>
        <nav className="hidden h-full items-center gap-[65px] text-base font-normal tracking-[.02em] md:flex">
          <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/designers">Thuê Freelancer</NavLink>
          <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/register">Tìm việc</NavLink>
          <div className="group flex h-full items-center">
            <button className="flex items-center gap-2 text-white/95 hover:text-white">
              Danh mục <ChevronDown size={22} />
            </button>
            <div className="invisible absolute left-1/2 top-16 w-[min(1176px,calc(100vw-32px))] -translate-x-1/2 border border-line bg-white px-[96px] py-8 text-ink opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-4 gap-x-[92px] gap-y-11">
                {hotMenu.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-3 text-base font-bold leading-snug text-brand">{group.title}</h3>
                    <ul className="space-y-2 text-base leading-6 text-ink">
                      {group.items.map((item) => (
                        <li key={item}>
                          <Link className="hover:text-brand" to={`/services/${serviceSlug(item)}`}>{item}</Link>
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
  );
}