import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function RoleSelectionPage() {
  const { user } = useAuth();

  return (
    <AuthShell title="Chọn không gian làm việc">
      <div className="grid gap-3">
        {user?.roles.includes('client') && <Link to="/client"><Button className="w-full">Vào trang khách hàng</Button></Link>}
        {user?.roles.includes('designer') && <Link to="/designer"><Button className="w-full">Vào trang designer</Button></Link>}
        {user?.roles.includes('admin') && <Link to="/admin"><Button className="w-full">Vào trang quản trị</Button></Link>}
        <Link to="/designers"><Button variant="secondary" className="w-full">Tiếp tục khám phá</Button></Link>
      </div>
    </AuthShell>
  );
}
