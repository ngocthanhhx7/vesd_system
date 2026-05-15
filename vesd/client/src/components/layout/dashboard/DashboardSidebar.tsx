import { LayoutDashboard } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { dashboardLinks, DashboardRole } from './dashboardNavigation';

export function DashboardSidebar({ role }: { role: DashboardRole }) {
  return (
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
  );
}
