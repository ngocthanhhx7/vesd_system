import { Bell, LogOut, Search, UserRound } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { DashboardRole } from './dashboardNavigation';
import { useNavigate } from 'react-router-dom';

export function DashboardHeader({ role }: { role: DashboardRole }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleLabel = role === 'client' ? 'Khách hàng' : role === 'designer' ? 'Người thiết kế' : 'Quản trị viên';
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 text-base text-muted"><Search size={17} /> Tìm dự án, designer, giao dịch</div>
        <div className="flex items-center gap-3">
          <Bell size={18} />
          <div className="hidden text-right text-base sm:block"><div className="font-semibold">{user?.name}</div><div className="text-muted">{roleLabel}</div></div>
          <div className="h-9 w-9 overflow-hidden rounded-full bg-soft">
            {user?.avatar ? <img className="h-full w-full object-cover" src={user.avatar} alt={user.name} /> : <UserRound className="m-1.5 h-6 w-6" />}
          </div>
          <Button variant="ghost" aria-label="Đăng xuất" onClick={handleLogout}><LogOut size={16} /></Button>
        </div>
      </div>
    </header>
  );
}
