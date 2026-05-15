import { Bell, LogOut, Search, UserRound } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { DashboardRole } from './dashboardNavigation';

export function DashboardHeader({ role }: { role: DashboardRole }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white">
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
  );
}
