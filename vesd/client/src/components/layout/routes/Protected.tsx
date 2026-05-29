import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export function Protected({ role }: { role?: string }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8">Đang tải...</div>;
  if (!user) return <div className="p-8">Vui lòng đăng nhập để tiếp tục.</div>;
  if (role && !user.roles.includes(role)) return <div className="p-8">Bạn không có quyền truy cập trang này.</div>;

  return <Outlet />;
}

