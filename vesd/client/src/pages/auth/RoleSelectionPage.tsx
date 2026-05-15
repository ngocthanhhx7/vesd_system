import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function RoleSelectionPage() {
  const { user } = useAuth();

  return (
    <AuthShell title="Chon khong gian lam viec">
      <div className="grid gap-3">
        {user?.roles.includes('client') && <Link to="/client"><Button className="w-full">Vao Client Dashboard</Button></Link>}
        {user?.roles.includes('designer') && <Link to="/designer"><Button className="w-full">Vao Designer Dashboard</Button></Link>}
        {user?.roles.includes('admin') && <Link to="/admin"><Button className="w-full">Vao Admin Dashboard</Button></Link>}
        <Link to="/designers"><Button variant="secondary" className="w-full">Tiep tuc kham pha</Button></Link>
      </div>
    </AuthShell>
  );
}
