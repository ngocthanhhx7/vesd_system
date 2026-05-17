import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Clock, CreditCard, ShieldAlert } from 'lucide-react';
import { Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';

export function WalletPage() {
  const { data } = useQuery({ queryKey: ['wallet'], queryFn: endpoints.wallet });
  const { data: tx = [] } = useQuery({ queryKey: ['tx'], queryFn: endpoints.transactions });
  return <Dashboard title="Wallet"><div className="grid gap-4 md:grid-cols-3"><Metric label="Balance" value={(data?.balance || 0).toLocaleString('vi-VN')} icon={CreditCard} /><Metric label="Escrow funded" value={(data?.escrowBalance || 0).toLocaleString('vi-VN')} icon={ShieldAlert} /><Metric label="Pending" value={(data?.pendingBalance || 0).toLocaleString('vi-VN')} icon={Clock} /></div><Section title="Transaction history">{tx.map((t: any) => <Card key={t._id}><div className="flex justify-between"><span>{t.type}</span><span>{t.amount?.toLocaleString('vi-VN')}d</span><StatusBadge status={t.status} /></div></Card>)}</Section></Dashboard>;
}

export function ReviewsPage() {
  return <Dashboard title="Client Reviews"><Card><Textarea placeholder="Viet danh gia cho designer" /><Select className="mt-3"><option>5 sao</option><option>4 sao</option></Select><Button className="mt-3">Gui review</Button></Card></Dashboard>;
}

export function SettingsPage() {
  const { updateUser } = useAuth();
  const { data } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '', dateOfBirth: '' });
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!data?.user) return;
    setForm({
      name: data.user.name || '',
      email: data.user.email || '',
      phone: data.user.phone || '',
      avatar: data.user.avatar || '',
      dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.slice(0, 10) : ''
    });
  }, [data?.user]);
  const save = useMutation({
    mutationFn: () => endpoints.updateMe({ ...form, dateOfBirth: form.dateOfBirth || null }),
    onSuccess: (user) => {
      updateUser(user);
      setMessage('Da cap nhat tai khoan');
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Khong the cap nhat tai khoan')
  });
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <Dashboard title="Tài khoản">
      <Card>
        <div className="mb-5 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-soft">{form.avatar ? <img className="h-full w-full object-cover" src={form.avatar} alt={form.name} /> : null}</div>
          <div><h2 className="text-xl font-black">{form.name || 'Tai khoan VESD'}</h2><p className="text-sm text-muted">{data?.user?.emailVerified ? 'Email da xac thuc' : 'Email chua xac thuc'}</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Tên hiển thị" value={form.name} onChange={(event) => setField('name', event.target.value)} />
          <Input type="email" placeholder="Gmail" value={form.email} onChange={(event) => setField('email', event.target.value)} />
          <Input placeholder="Avatar URL" value={form.avatar} onChange={(event) => setField('avatar', event.target.value)} />
          <Input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
          <Select><option>Email notifications on</option><option>Off</option></Select>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Dang luu...' : 'Luu cai dat'}</Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>
    </Dashboard>
  );
}

export function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const change = useMutation({
    mutationFn: (body: unknown) => endpoints.changePassword(body),
    onSuccess: () => setMessage('Da doi mat khau'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Khong the doi mat khau')
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change.mutate({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') });
  }
  return <Dashboard title="Đổi mật khẩu"><Card><form className="grid gap-4 md:max-w-md" onSubmit={submit}><Input name="currentPassword" type="password" placeholder="Mật khẩu hiện tại" /><Input name="newPassword" type="password" placeholder="Mật khẩu mới" /><Button disabled={change.isPending}>{change.isPending ? 'Dang cap nhat...' : 'Doi mat khau'}</Button></form>{message && <p className="mt-3 text-sm text-muted">{message}</p>}</Card></Dashboard>;
}
