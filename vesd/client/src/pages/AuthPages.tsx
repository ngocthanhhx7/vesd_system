import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/Button';
import { Card, Input, Select } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';

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
  return <AuthShell title="Dang nhap"><form onSubmit={submit} className="space-y-4"><Input name="email" type="email" placeholder="Email" defaultValue="client@vesd.vn" /><Input name="password" type="password" placeholder="Mat khau" defaultValue="12345678" />{error && <p className="text-sm text-red-600">{error}</p>}<Button className="w-full">Dang nhap</Button><Link className="text-sm text-brand" to="/forgot-password">Quen mat khau?</Link></form></AuthShell>;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await register({ name: String(fd.get('name')), email: String(fd.get('email')), password: String(fd.get('password')), role: String(fd.get('role')) });
    navigate('/role-selection');
  }
  return <AuthShell title="Tao tai khoan VESD"><form onSubmit={submit} className="space-y-4"><Input name="name" placeholder="Ho ten" /><Input name="email" type="email" placeholder="Email" /><Input name="password" type="password" placeholder="Mat khau toi thieu 8 ky tu" /><Select name="role"><option value="client">Client</option><option value="designer">Designer</option></Select><Button className="w-full">Dang ky</Button></form></AuthShell>;
}

export function RoleSelectionPage() {
  const { user } = useAuth();
  return <AuthShell title="Chon khong gian lam viec"><div className="grid gap-3">{user?.roles.includes('client') && <Link to="/client"><Button className="w-full">Vao Client Dashboard</Button></Link>}{user?.roles.includes('designer') && <Link to="/designer"><Button className="w-full">Vao Designer Dashboard</Button></Link>}{user?.roles.includes('admin') && <Link to="/admin"><Button className="w-full">Vao Admin Dashboard</Button></Link>}<Link to="/designers"><Button variant="secondary" className="w-full">Tiep tuc kham pha</Button></Link></div></AuthShell>;
}

export function ForgotPasswordPage() {
  return <AuthShell title="Khoi phuc mat khau"><div className="space-y-4"><Input type="email" placeholder="Email cua ban" /><Button className="w-full">Gui link khoi phuc</Button></div></AuthShell>;
}

export function ResetPasswordPage() {
  return <AuthShell title="Dat lai mat khau"><div className="space-y-4"><Input type="password" placeholder="Mat khau moi" /><Input type="password" placeholder="Nhap lai mat khau" /><Button className="w-full">Cap nhat mat khau</Button></div></AuthShell>;
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="blue-grid grid min-h-[calc(100vh-130px)] place-items-center py-10"><Helmet><title>{title} | VESD</title></Helmet><Card className="w-[min(440px,calc(100%-32px))] border-0 shadow-2xl"><img src="/assets/vesd-logo-blue.svg" alt="VESD" className="mb-6 h-10 w-auto" /><h1 className="mb-6 text-2xl font-black">{title}</h1>{children}</Card></main>;
}
