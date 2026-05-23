import { LayoutDashboard } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { dashboardLinks, DashboardRole } from './dashboardNavigation';

export function DashboardSidebar({ role }: { role: DashboardRole }) {
  return (
    <aside className="fixed left-0 top-0 hidden h-full w-64 overflow-hidden border-r border-line bg-white lg:block">
      <img className="absolute inset-0 h-full w-full object-cover" src="/assets/Frame 675679874.png" alt="" />
      <div className="absolute inset-0 bg-white/88" />
      <div className="relative z-10 p-5">
        <Link to="/" className="flex items-center"><img src="/assets/vesd-logo-blue.svg" alt="VESD" className="h-10 w-auto" /></Link>
        <nav className="mt-8 space-y-1">
          {dashboardLinks[role].map(([href, label]) => (
            <NavLink key={href} to={href} end className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold ${isActive ? 'bg-white text-brand shadow-sm' : 'text-muted hover:bg-white/75'}`}>
              <LayoutDashboard size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
