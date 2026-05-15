import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await login(String(fd.get('email')), String(fd.get('password')));
      navigate('/role-selection');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <AuthShell title="Dang nhap">
      <form onSubmit={submit} className="space-y-4">
        <Input name="email" type="email" placeholder="Email" defaultValue="client@vesd.vn" />
        <Input name="password" type="password" placeholder="Mat khau" defaultValue="12345678" />
        {error && <p className="text-base text-secondary">{error}</p>}
        <Button className="w-full">Dang nhap</Button>
        <Link className="text-base text-brand" to="/forgot-password">Quen mat khau?</Link>
      </form>
    </AuthShell>
  );
}
