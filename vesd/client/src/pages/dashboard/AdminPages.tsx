import { useQuery } from '@tanstack/react-query';
import { CreditCard, FolderKanban, ShieldAlert, Users } from 'lucide-react';
import { Card, Input, StatusBadge } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

export function AdminDashboard() {
  return <Dashboard title="Admin Dashboard"><div className="grid gap-4 md:grid-cols-4"><Metric label="Users" value="16" icon={Users} /><Metric label="Active projects" value="10" icon={FolderKanban} /><Metric label="Revenue" value="4.2M" icon={CreditCard} /><Metric label="Disputes" value="2" icon={ShieldAlert} /></div></Dashboard>;
}

export function AdminListPage({ type }: { type: string }) {
  const query = type === 'users' ? endpoints.adminUsers : type === 'projects' ? endpoints.adminProjects : type === 'disputes' ? endpoints.adminDisputes : endpoints.adminUsers;
  const { data = [] } = useQuery({ queryKey: ['admin', type], queryFn: query });
  return <Dashboard title={`Admin ${type}`}><Card><div className="overflow-x-auto"><table className="w-full text-left text-base"><thead><tr className="border-b border-line"><th className="py-2">Name/Title</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.map((item: any) => <tr key={item._id} className="border-b border-line"><td className="py-3">{item.name || item.title || item.reason || item.email}</td><td><StatusBadge status={item.status || item.verificationStatus} /></td><td><Button variant="secondary">View</Button></td></tr>)}</tbody></table></div></Card></Dashboard>;
}

export function AdminSimplePage({ title }: { title: string }) {
  return <Dashboard title={title}><Card><p className="text-muted">Quan ly, tim kiem, loc va cap nhat du lieu {title.toLowerCase()}.</p><div className="mt-4 flex gap-3"><Input placeholder="Search" /><Button>Save changes</Button></div></Card></Dashboard>;
}
