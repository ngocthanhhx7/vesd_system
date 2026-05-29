import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, FolderKanban, Wallet, AlertTriangle, ShieldCheck, Crown, Megaphone, X } from 'lucide-react';
import { endpoints, getToken } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const categoryConfig: Record<string, { icon: typeof Bell; color: string }> = {
  project: { icon: FolderKanban, color: '#2453D6' },
  wallet: { icon: Wallet, color: '#10b981' },
  dispute: { icon: AlertTriangle, color: '#f59e0b' },
  verification: { icon: ShieldCheck, color: '#8b5cf6' },
  premium: { icon: Crown, color: '#f97316' },
  system: { icon: Megaphone, color: '#6b7280' }
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN');
}

function groupByDate(notifications: any[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: any[] }[] = [];
  const map = new Map<string, any[]>();

  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? 'Hôm nay' : d === yesterday ? 'Hôm qua' : new Date(n.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
    if (!map.has(label)) { map.set(label, []); groups.push({ label, items: map.get(label)! }); }
    map.get(label)!.push(n);
  }
  return groups;
}

// ── Badge: used in header ──
export function NotificationBell({ onClick }: { onClick: () => void }) {
  const { data } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: endpoints.notificationUnreadCount,
    refetchInterval: 30000
  });

  const count = data?.unreadCount || 0;

  return (
    <button className="notification-bell-btn" onClick={onClick} aria-label="Thông báo">
      <Bell size={19} />
      {count > 0 && (
        <span className="notification-badge">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  );
}

// ── SSE Hook ──
function useNotificationSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const es = new EventSource(`${API_URL}/notifications/stream`, {
      // EventSource doesn't support headers, we need a workaround
      // For now, we rely on polling. SSE requires cookie-based auth or a proxy.
    } as any);

    // Fallback: the polling in useQuery already handles updates
    // SSE will be connected via fetch-event-source in production
    return () => es?.close();
  }, [queryClient]);
}

// ── Drawer ──
export function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => endpoints.notifications(page),
    enabled: open
  });

  const markRead = useMutation({
    mutationFn: (id: string) => endpoints.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: () => endpoints.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    }
  });

  const handleClick = (notif: any) => {
    if (!notif.isRead) markRead.mutate(notif._id);
    if (notif.actionUrl) {
      onClose();
      navigate(notif.actionUrl);
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const hasMore = data?.pagination?.hasMore || false;
  const groups = groupByDate(notifications);

  // Scroll to load more
  const handleScroll = () => {
    if (!listRef.current || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setPage(p => p + 1);
    }
  };

  // Reset page on close/open
  useEffect(() => { if (open) setPage(1); }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && <div className="notification-backdrop" onClick={onClose} />}

      {/* Drawer */}
      <div className={`notification-drawer ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="notification-drawer-header">
          <div>
            <h3 className="text-base font-bold text-ink">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted">{unreadCount} chưa đọc</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-btn"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
            <button className="notification-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="notification-drawer-list" ref={listRef} onScroll={handleScroll}>
          {isLoading && (
            <div className="notification-loading">
              <div className="search-overlay-spinner" />
              <span>Đang tải...</span>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="notification-empty">
              <Bell size={36} className="text-muted/20" />
              <p>Bạn chưa có thông báo</p>
            </div>
          )}

          {groups.map(group => (
            <div key={group.label}>
              <div className="notification-date-label">{group.label}</div>
              {group.items.map((notif: any) => {
                const cat = categoryConfig[notif.category] || categoryConfig.system;
                const Icon = cat.icon;
                return (
                  <button
                    key={notif._id}
                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                    onClick={() => handleClick(notif)}
                  >
                    <div className="notification-item-icon" style={{ backgroundColor: cat.color + '15', color: cat.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="notification-item-content">
                      <p className="notification-item-title">{notif.title}</p>
                      {notif.message && <p className="notification-item-message">{notif.message}</p>}
                      <p className="notification-item-time">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && <div className="notification-unread-dot" />}
                  </button>
                );
              })}
            </div>
          ))}

          {hasMore && !isLoading && (
            <button className="notification-load-more" onClick={() => setPage(p => p + 1)}>
              Tải thêm
            </button>
          )}
        </div>
      </div>
    </>
  );
}

