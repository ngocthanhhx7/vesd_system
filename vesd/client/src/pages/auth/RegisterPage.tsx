import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await register({ name: String(fd.get('name')), email: String(fd.get('email')), password: String(fd.get('password')), role: String(fd.get('role')) });
    navigate('/role-selection');
  }

  return (
    <AuthShell title="Tao tai khoan VESD">
      <form onSubmit={submit} className="space-y-4">
        <Input name="name" placeholder="Ho ten" />
        <Input name="email" type="email" placeholder="Email" />
        <Input name="password" type="password" placeholder="Mat khau toi thieu 8 ky tu" />
        <Select name="role"><option value="client">Client</option><option value="designer">Designer</option></Select>
        <Button className="w-full">Dang ky</Button>
      </form>
    </AuthShell>
  );
}
