import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, CreditCard, FolderKanban, ShieldAlert, Users } from 'lucide-react';
import { endpoints } from '../services/api';
import { Badge, Card, EmptyState, Input, Select, StatusBadge, Textarea } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return <Card className="relative overflow-hidden"><div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-blue-50" /><Icon className="relative text-brand" /><p className="relative mt-3 text-sm text-muted">{label}</p><p className="relative text-2xl font-black">{value}</p></Card>;
}

export function ProjectCard({ project }: { project: any }) {
  return <Card className="border-blue-100"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{project.title}</h3><p className="text-sm text-muted">{project.category}</p></div><StatusBadge status={project.status} /></div><div className="mt-4 flex items-center justify-between rounded-lg bg-soft p-3 text-sm"><span className="font-bold text-brand">{project.budget?.agreed?.toLocaleString('vi-VN') || project.budget?.max?.toLocaleString('vi-VN')}d</span><Link className="font-semibold text-brand" to={`workspace/${project._id}`}>Mo workspace</Link></div></Card>;
}

export function ClientDashboard() {
  const { data = [] } = useQuery({ queryKey: ['my-projects'], queryFn: endpoints.myProjects });
  return <Dashboard title="Client Dashboard"><div className="grid gap-4 md:grid-cols-4"><Metric label="Active projects" value={data.filter((p: any) => p.status !== 'completed').length} icon={FolderKanban} /><Metric label="Pending approvals" value={data.filter((p: any) => p.status === 'submitted').length} icon={Clock} /><Metric label="Total spent" value="18M" icon={CreditCard} /><Metric label="Saved designers" value="12" icon={Users} /></div><Section title="Du an gan day">{data.length ? data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />) : <EmptyState title="Chua co du an" />}</Section></Dashboard>;
}

export function CreateProjectPage() {
  return <Dashboard title="Create Project Brief"><Card className="border-blue-100"><div className="mb-5 rounded-lg bg-brand p-5 text-white"><h2 className="text-xl font-black">Dang brief ro rang de matching nhanh hon</h2><p className="text-sm text-blue-50">Scope, deliverable, revision va deadline se duoc dua vao agreement va escrow.</p></div><form className="grid gap-4 md:grid-cols-2"><Input placeholder="Project title" /><Select><option>logo-design</option><option>brand-identity</option><option>social-media-design</option></Select><Textarea className="md:col-span-2" placeholder="Description" /><Input placeholder="Target audience" /><Input placeholder="Style preference" /><Input placeholder="Budget min" /><Input placeholder="Budget max" /><Input type="date" /><Input placeholder="Required deliverables" /><Select><option>2 revisions</option><option>3 revisions</option></Select><Select><option>Junior</option><option>Mid-level</option><option>Senior</option></Select><label className="text-sm"><input type="checkbox" /> Need urgent delivery?</label><label className="text-sm"><input type="checkbox" /> Need printing support?</label><Button className="md:col-span-2">Dang du an</Button></form></Card></Dashboard>;
}

export function MatchingPage() {
  const { data } = useQuery({ queryKey: ['match'], queryFn: () => endpoints.designers('?limit=6&sort=popularity') });
  return <Dashboard title="Designer Matching Result"><div className="grid gap-4 md:grid-cols-3">{data?.items?.map((d: any, i: number) => <Card key={d._id}><Badge tone="success">{92 - i * 4}% match</Badge><h3 className="mt-3 font-bold">{d.userId?.name}</h3><p className="text-sm text-muted">Phu hop category, style va ngan sach brief.</p><Button className="mt-4 w-full">Invite designer</Button></Card>)}</div></Dashboard>;
}

export function AgreementPage() {
  return <Dashboard title="Project Agreement"><Card><div className="grid gap-4 md:grid-cols-2">{['Scope', 'Price', 'Milestones', 'Deadline', 'Revision limit', 'Deliverables', 'IP terms', 'Refund/dispute condition'].map((x) => <div key={x}><p className="text-sm text-muted">{x}</p><p className="font-semibold">Thong tin thoa thuan mau cho du an.</p></div>)}</div><Button className="mt-6">Confirm agreement</Button></Card></Dashboard>;
}

export function EscrowPage() {
  return <Dashboard title="Escrow Payment"><Card><div className="grid gap-4 md:grid-cols-4"><Metric label="Payment amount" value="2.500.000d" icon={CreditCard} /><Metric label="Platform fee" value="200.000d" icon={BarChart3} /><Metric label="Total" value="2.700.000d" icon={CheckCircle2} /><Metric label="Status" value="waiting" icon={Clock} /></div><div className="mt-5 flex flex-wrap gap-3">{['Bank transfer', 'MoMo', 'VNPay', 'Card'].map((m) => <Button key={m} variant="secondary">{m}</Button>)}</div></Card></Dashboard>;
}

export function WorkspacePage({ designer = false }: { designer?: boolean }) {
  return <Dashboard title={designer ? 'Designer Project Workspace' : 'Client Project Workspace'}><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card><h2 className="font-bold">Milestone timeline</h2>{['Brief confirmed', 'Concept submitted', 'Feedback', 'Final handover'].map((x, i) => <div key={x} className="mt-4 flex gap-3"><div className="mt-1 h-3 w-3 rounded-full bg-brand" /><div><p className="font-semibold">{x}</p><p className="text-sm text-muted">{i < 2 ? 'Hoan thanh' : 'Dang cho xu ly'}</p></div></div>)}<div className="mt-6 flex gap-3"><Button>{designer ? 'Upload draft' : 'Approve milestone'}</Button><Button variant="secondary">{designer ? 'Upload final files' : 'Request revision'}</Button><Button variant="danger">Open dispute</Button></div></Card><Card><h2 className="font-bold">Chat / Feedback</h2><Textarea className="mt-4" placeholder="Nhap feedback tap trung tai day" /><Button className="mt-3 w-full">Gui</Button></Card></div></Dashboard>;
}

export function ChecklistPage() {
  const items = ['AI/PSD source file', 'PNG transparent', 'PDF vector', 'SVG', 'JPG preview', 'Font name', 'Color code'];
  return <Dashboard title="File Handover Checklist"><Card>{items.map((item, i) => <div key={item} className="flex items-center justify-between border-b border-line py-3 last:border-0"><span>{item}</span><StatusBadge status={i < 4 ? 'approved' : 'pending'} /></div>)}<Button className="mt-5">Approve final delivery</Button></Card></Dashboard>;
}

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

export function DesignerDashboard() {
  const { data = [] } = useQuery({ queryKey: ['designer-projects'], queryFn: endpoints.myProjects });
  return <Dashboard title="Designer Dashboard"><div className="grid gap-4 md:grid-cols-5"><Metric label="Active projects" value={data.length} icon={FolderKanban} /><Metric label="New requests" value="4" icon={Clock} /><Metric label="Earnings" value="12M" icon={CreditCard} /><Metric label="Profile views" value="840" icon={BarChart3} /><Metric label="Pending payouts" value="2M" icon={WalletIcon} /></div><Section title="Project requests">{data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />)}</Section></Dashboard>;
}
function WalletIcon(props: any) { return <CreditCard {...props} />; }

export function DesignerProfileSetup() {
  return <Dashboard title="Designer Profile Setup"><Card><form className="grid gap-4 md:grid-cols-2"><Input placeholder="Title" /><Input placeholder="Starting price" /><Textarea className="md:col-span-2" placeholder="Bio" /><Input placeholder="Skills" /><Input placeholder="Categories" /><Input placeholder="Style tags" /><Input placeholder="Availability" /><Input placeholder="Education" /><Input placeholder="Experience" /><Button>Gui xac minh</Button></form></Card></Dashboard>;
}

export function PortfolioManager() {
  return <Dashboard title="Portfolio Manager"><Card><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Project title" /><Input placeholder="Category" /><Textarea className="md:col-span-2" placeholder="Description" /><Input type="file" /><Input placeholder="Tools used" /><Button>Add portfolio item</Button></div></Card></Dashboard>;
}

export function RequestsPage() {
  return <Dashboard title="Project Requests"><Section title="Incoming requests">{[1, 2, 3].map((i) => <Card key={i}><h3 className="font-bold">Yeu cau thiet ke #{i}</h3><p className="text-sm text-muted">Client can de xuat scope va timeline.</p><div className="mt-4 flex gap-2"><Button>Accept</Button><Button variant="secondary">Send proposal</Button><Button variant="danger">Reject</Button></div></Card>)}</Section></Dashboard>;
}

export function PremiumPage() {
  const { data = [] } = useQuery({ queryKey: ['plans'], queryFn: endpoints.premiumPlans });
  return <Dashboard title="Designer Premium"><div className="grid gap-4 md:grid-cols-3">{data.filter((p: any) => p.roleTarget !== 'client').map((p: any) => <Card key={p._id}><Badge tone="premium">Premium</Badge><h2 className="mt-3 text-xl font-black">{p.name}</h2><p className="text-2xl font-black">{p.price?.toLocaleString('vi-VN')}d</p><Button className="mt-5">Nang cap</Button></Card>)}</div></Dashboard>;
}

export function AdminDashboard() {
  return <Dashboard title="Admin Dashboard"><div className="grid gap-4 md:grid-cols-4"><Metric label="Users" value="16" icon={Users} /><Metric label="Active projects" value="10" icon={FolderKanban} /><Metric label="Revenue" value="4.2M" icon={CreditCard} /><Metric label="Disputes" value="2" icon={ShieldAlert} /></div></Dashboard>;
}

export function AdminListPage({ type }: { type: string }) {
  const query = type === 'users' ? endpoints.adminUsers : type === 'projects' ? endpoints.adminProjects : type === 'disputes' ? endpoints.adminDisputes : endpoints.adminUsers;
  const { data = [] } = useQuery({ queryKey: ['admin', type], queryFn: query });
  return <Dashboard title={`Admin ${type}`}><Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2">Name/Title</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.map((item: any) => <tr key={item._id} className="border-b border-line"><td className="py-3">{item.name || item.title || item.reason || item.email}</td><td><StatusBadge status={item.status || item.verificationStatus} /></td><td><Button variant="secondary">View</Button></td></tr>)}</tbody></table></div></Card></Dashboard>;
}

export function AdminSimplePage({ title }: { title: string }) {
  return <Dashboard title={title}><Card><p className="text-muted">Quan ly, tim kiem, loc va cap nhat du lieu {title.toLowerCase()}.</p><div className="mt-4 flex gap-3"><Input placeholder="Search" /><Button>Save changes</Button></div></Card></Dashboard>;
}

function Dashboard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wide text-brand">VESD workspace</p><h1 className="text-3xl font-black">{title}</h1></div><div className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand shadow-sm md:block">Escrow-ready marketplace</div></div>{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h2 className="mb-3 text-xl font-black">{title}</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
}
