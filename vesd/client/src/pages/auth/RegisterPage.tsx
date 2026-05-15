import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await register({ name: String(fd.get('name')), email: String(fd.get('email')), password: String(fd.get('password')), role: String(fd.get('role')) });
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
    <AuthShell title="Tao tai khoan VESD">
      <form onSubmit={submit} className="space-y-4">
        <Input name="name" placeholder="Ho ten" />
        <Input name="email" type="email" placeholder="Email" />
        <Input name="password" type="password" placeholder="Mat khau toi thieu 8 ky tu" />
        <Select name="role"><option value="client">Client</option><option value="designer">Designer</option></Select>
        {error && <p className="text-base text-secondary">{error}</p>}
        <Button className="w-full">Dang ky</Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10"></div>
        <span className="text-sm text-white/40">hoac</span>
        <div className="h-px flex-1 bg-white/10"></div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Dang ky bang Google that bai')}
          theme="filled_black"
          size="large"
          width="100%"
          text="signup_with"
          shape="rectangular"
        />
      </div>
    </AuthShell>
  );
}
