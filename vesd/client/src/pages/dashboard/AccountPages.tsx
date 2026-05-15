import { useQuery } from '@tanstack/react-query';
import { Clock, CreditCard, ShieldAlert } from 'lucide-react';
import { Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
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
  return <Dashboard title="Settings"><Card><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Ho ten / Cong ty" /><Input placeholder="Phone" /><Input placeholder="Billing info" /><Select><option>Email notifications on</option><option>Off</option></Select><Button>Luu cai dat</Button></div></Card></Dashboard>;
}
