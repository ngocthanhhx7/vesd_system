import { useEffect, useState } from 'react';
import { LogOut, Search } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { useAuth } from '../../../hooks/useAuth';
import { DashboardRole } from './dashboardNavigation';
import { useNavigate } from 'react-router-dom';
import { SearchOverlay } from '../../ui/SearchOverlay';
import { NotificationBell, NotificationDrawer } from '../../ui/NotificationDrawer';

export function DashboardHeader({ role }: { role: DashboardRole }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const roleLabel = role === 'client' ? 'Khách hàng' : role === 'designer' ? 'Người thiết kế' : 'Quản trị viên';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="flex h-16 min-w-0 items-center justify-between gap-2 px-4 lg:px-8">
          {/* Search trigger */}
          <button
            className="header-search-trigger min-w-0 flex-1 sm:flex-none"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} />
            <span className="hidden sm:inline">Tìm kiếm dự án, designer, giao dịch...</span>
            <span className="sm:hidden">Tìm kiếm...</span>
            <kbd className="header-search-kbd hidden md:inline-flex">⌘K</kbd>
          </button>

          {/* Right side */}
          <div className="flex flex-none items-center gap-1 sm:gap-2">
            <NotificationBell onClick={() => setNotifOpen(true)} />
            <div className="hidden text-right text-sm sm:block">
              <div className="font-semibold text-ink">{user?.name}</div>
              <div className="text-xs text-muted">{roleLabel}</div>
            </div>
            <Avatar className="h-9 w-9" src={user?.avatar} name={user?.name} fallbackClassName="text-muted" />
            <Button variant="ghost" aria-label="Đăng xuất" onClick={handleLogout}><LogOut size={16} /></Button>
          </div>
        </div>
      </header>

      {/* Overlays */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}

