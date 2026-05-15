import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { Badge, Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

export function CreateProjectPage() {
  return <Dashboard title="Create Project Brief"><Card className="border-line"><div className="mb-5 rounded-lg bg-brand p-5 text-white"><h2 className="text-2xl font-black">Dang brief ro rang de matching nhanh hon</h2><p className="text-base text-soft">Scope, deliverable, revision va deadline se duoc dua vao agreement va escrow.</p></div><form className="grid gap-4 md:grid-cols-2"><Input placeholder="Project title" /><Select><option>logo-design</option><option>brand-identity</option><option>social-media-design</option></Select><Textarea className="md:col-span-2" placeholder="Description" /><Input placeholder="Target audience" /><Input placeholder="Style preference" /><Input placeholder="Budget min" /><Input placeholder="Budget max" /><Input type="date" /><Input placeholder="Required deliverables" /><Select><option>2 revisions</option><option>3 revisions</option></Select><Select><option>Junior</option><option>Mid-level</option><option>Senior</option></Select><label className="text-base"><input type="checkbox" /> Need urgent delivery?</label><label className="text-base"><input type="checkbox" /> Need printing support?</label><Button className="md:col-span-2">Dang du an</Button></form></Card></Dashboard>;
}

export function MatchingPage() {
  const { data } = useQuery({ queryKey: ['match'], queryFn: () => endpoints.designers('?limit=6&sort=popularity') });
  return <Dashboard title="Designer Matching Result"><div className="grid gap-4 md:grid-cols-3">{data?.items?.map((d: any, i: number) => <Card key={d._id}><Badge tone="success">{92 - i * 4}% match</Badge><h3 className="mt-3 font-bold">{d.userId?.name}</h3><p className="text-base text-muted">Phu hop category, style va ngan sach brief.</p><Button className="mt-4 w-full">Invite designer</Button></Card>)}</div></Dashboard>;
}

export function AgreementPage() {
  return <Dashboard title="Project Agreement"><Card><div className="grid gap-4 md:grid-cols-2">{['Scope', 'Price', 'Milestones', 'Deadline', 'Revision limit', 'Deliverables', 'IP terms', 'Refund/dispute condition'].map((x) => <div key={x}><p className="text-base text-muted">{x}</p><p className="font-semibold">Thong tin thoa thuan mau cho du an.</p></div>)}</div><Button className="mt-6">Confirm agreement</Button></Card></Dashboard>;
}

export function EscrowPage() {
  return <Dashboard title="Escrow Payment"><Card><div className="grid gap-4 md:grid-cols-4"><Metric label="Payment amount" value="2.500.000d" icon={CreditCard} /><Metric label="Platform fee" value="200.000d" icon={BarChart3} /><Metric label="Total" value="2.700.000d" icon={CheckCircle2} /><Metric label="Status" value="waiting" icon={Clock} /></div><div className="mt-5 flex flex-wrap gap-3">{['Bank transfer', 'MoMo', 'VNPay', 'Card'].map((m) => <Button key={m} variant="secondary">{m}</Button>)}</div></Card></Dashboard>;
}

export function WorkspacePage({ designer = false }: { designer?: boolean }) {
  return <Dashboard title={designer ? 'Designer Project Workspace' : 'Client Project Workspace'}><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card><h2 className="font-bold">Milestone timeline</h2>{['Brief confirmed', 'Concept submitted', 'Feedback', 'Final handover'].map((x, i) => <div key={x} className="mt-4 flex gap-3"><div className="mt-1 h-3 w-3 rounded-full bg-brand" /><div><p className="font-semibold">{x}</p><p className="text-base text-muted">{i < 2 ? 'Hoan thanh' : 'Dang cho xu ly'}</p></div></div>)}<div className="mt-6 flex gap-3"><Button>{designer ? 'Upload draft' : 'Approve milestone'}</Button><Button variant="secondary">{designer ? 'Upload final files' : 'Request revision'}</Button><Button variant="danger">Open dispute</Button></div></Card><Card><h2 className="font-bold">Chat / Feedback</h2><Textarea className="mt-4" placeholder="Nhap feedback tap trung tai day" /><Button className="mt-3 w-full">Gui</Button></Card></div></Dashboard>;
}

export function ChecklistPage() {
  const items = ['AI/PSD source file', 'PNG transparent', 'PDF vector', 'SVG', 'JPG preview', 'Font name', 'Color code'];
  return <Dashboard title="File Handover Checklist"><Card>{items.map((item, i) => <div key={item} className="flex items-center justify-between border-b border-line py-3 last:border-0"><span>{item}</span><StatusBadge status={i < 4 ? 'approved' : 'pending'} /></div>)}<Button className="mt-5">Approve final delivery</Button></Card></Dashboard>;
}
