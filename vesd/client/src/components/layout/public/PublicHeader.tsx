import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, Mail, Menu, Search, Settings, UserRound, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { hotMenu, serviceSlug } from './publicNavigation';
import { Avatar } from '../../ui/Avatar';

export function PublicHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardPath = user?.roles.includes('admin') ? '/admin' : user?.roles.includes('designer') ? '/designer' : '/client';
  const jobsPath = user?.roles.includes('designer') ? '/designer/jobs' : user ? dashboardPath : '/register';
  const projectsPath = !user
    ? '/register'
    : user.roles.includes('designer')
      ? '/designer/projects'
      : user.roles.includes('client')
        ? '/client/projects'
        : '/client/create-project';
  const messagesPath = user?.roles.includes('designer') ? '/designer/messages' : user?.roles.includes('client') ? '/client/messages' : dashboardPath;
  const accountPath = user?.roles.includes('admin') ? '/admin/settings' : user?.roles.includes('designer') ? '/designer/settings' : '/client/settings';
  const passwordPath = user?.roles.includes('admin') ? '/admin/password' : user?.roles.includes('designer') ? '/designer/password' : '/client/password';

  function handleLogout() {
    logout();
    setMobileOpen(false);
    navigate('/');
  }

  function goTo(path: string) {
    setMobileOpen(false);
    navigate(path);
  }

  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex h-full items-center" onClick={() => setMobileOpen(false)}>
          <img src="/assets/vesd-logo-header-white.svg" alt="VESD" className="h-[33px] w-auto" />
        </Link>
        <nav className="hidden h-full items-center gap-[65px] text-base font-normal tracking-[.02em] md:flex">
          <NavLink className="flex h-full items-center text-white/95 hover:text-white" to="/designers">Thuê Freelancer</NavLink>
          <NavLink className="flex h-full items-center text-white/95 hover:text-white" to={jobsPath}>Tìm việc</NavLink>
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
          <NavLink className="flex h-full items-center text-white/95 hover:text-white" to={projectsPath}>Dự án</NavLink>
        </nav>
        <div className="flex items-center gap-6">
          <button aria-label="Tìm kiếm" className="text-white/95 hover:text-white" onClick={() => goTo('/designers')}><Search size={24} /></button>
          <button aria-label="Tin nhắn" className="hidden text-white/95 hover:text-white sm:block" onClick={() => goTo(user ? messagesPath : '/login')}><Mail size={23} /></button>
          {user ? (
            <div className="group relative flex h-16 items-center">
              <button aria-label="Tài khoản" className="h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-white/10">
                <Avatar className="h-full w-full bg-white/10 text-white" src={user.avatar} name={user.name} fallbackClassName="text-white" />
              </button>
              <div className="invisible absolute right-0 top-14 w-56 rounded-lg border border-line bg-white py-2 text-ink opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                <button className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-soft" onClick={() => goTo(dashboardPath)}><LayoutDashboard size={17} />Bảng điều khiển</button>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-soft" onClick={() => goTo(accountPath)}><Settings size={17} />Tài khoản</button>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-soft" onClick={() => goTo(passwordPath)}><KeyRound size={17} />Đổi mật khẩu</button>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-left text-secondary hover:bg-soft" onClick={handleLogout}><LogOut size={17} />Đăng xuất</button>
              </div>
            </div>
          ) : (
            <button aria-label="Đăng nhập" className="text-white/95 hover:text-white" onClick={() => goTo('/login')}>
              <UserRound size={24} />
            </button>
          )}
          <button className="md:hidden" type="button" aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-white/15 bg-brand md:hidden">
          <nav className="container-page grid gap-1 py-4 text-base font-semibold">
            <button className="rounded-lg px-1 py-3 text-left text-white/95" onClick={() => goTo('/designers')}>Thuê Freelancer</button>
            <button className="rounded-lg px-1 py-3 text-left text-white/95" onClick={() => goTo(jobsPath)}>Tìm việc</button>
            <button className="rounded-lg px-1 py-3 text-left text-white/95" onClick={() => goTo(projectsPath)}>Dự án</button>
            <div className="mt-2 border-t border-white/15 pt-3">
              <p className="mb-2 text-sm font-bold uppercase text-white/70">Danh mục</p>
              <div className="grid gap-2 text-sm font-medium text-white/90">
                {hotMenu.slice(0, 2).flatMap((group) => group.items.slice(0, 3)).map((item) => (
                  <button key={item} className="rounded-lg px-1 py-2 text-left" onClick={() => goTo(`/services/${serviceSlug(item)}`)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-3 border-t border-white/15 pt-4">
              <button className="flex-1 rounded-full border border-white/40 px-4 py-2" onClick={() => goTo(user ? messagesPath : '/login')}>Tin nhắn</button>
              <button className="flex-1 rounded-full bg-white px-4 py-2 text-brand" onClick={() => goTo(user ? dashboardPath : '/login')}>{user ? 'Tài khoản' : 'Đăng nhập'}</button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

