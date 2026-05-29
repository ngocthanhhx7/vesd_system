import { Link, NavLink } from 'react-router-dom';
import { dashboardNav, DashboardRole } from './dashboardNavigation';
import { useAuth } from '../../../hooks/useAuth';
import { ChevronRight } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';

export function DashboardSidebar({ role }: { role: DashboardRole }) {
  const { user } = useAuth();
  const groups = dashboardNav[role];

  return (
    <aside className="sidebar-container fixed left-0 top-0 hidden h-full w-64 overflow-y-auto lg:block">
      {/* Logo */}
      <div className="sidebar-logo-area px-5 pb-2 pt-5">
        <Link to="/" className="inline-flex items-center">
          <img src="/assets/vesd-logo-white.svg" alt="VESD" className="h-8 w-auto" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vesd-logo-blue.svg'; }} />
        </Link>
      </div>

      {/* User Card */}
      <div className="mx-4 mt-4 rounded-xl bg-white/10 px-3 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-white/20 text-white" src={user?.avatar} name={user?.name} fallbackClassName="text-white/80" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name || 'Tài khoản'}</p>
            <p className="truncate text-xs text-white/60">
              {role === 'client' ? 'Khách hàng' : role === 'designer' ? 'Designer' : 'Quản trị viên'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="mt-5 px-3 pb-8">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? 'mt-5' : ''}>
            {group.title && (
              <p className="sidebar-group-title mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end
                    className={({ isActive }) =>
                      `sidebar-nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200 ${
                        isActive
                          ? 'sidebar-nav-active bg-white text-brand shadow-md shadow-black/8'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                          isActive ? 'bg-brand/10 text-brand' : 'bg-white/8 text-white/60 group-hover:bg-white/15 group-hover:text-white/90'
                        }`}>
                          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight size={14} className="text-brand/40" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

