import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
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

  async function handleGoogleSuccess(credentialResponse: any) {
    try {
      setError('');
      await loginWithGoogle(credentialResponse.credential);
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

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10"></div>
        <span className="text-sm text-white/40">hoac</span>
        <div className="h-px flex-1 bg-white/10"></div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Dang nhap Google that bai')}
          theme="filled_black"
          size="large"
          width="100%"
          text="signin_with"
          shape="rectangular"
        />
      </div>
    </AuthShell>
  );
}
