import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, CreditCard, FolderKanban } from 'lucide-react';
import { Badge, Card, Input, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

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
  return <Dashboard title="Project Requests"><Section title="Incoming requests">{[1, 2, 3].map((i) => <Card key={i}><h3 className="font-bold">Yeu cau thiet ke #{i}</h3><p className="text-base text-muted">Client can de xuat scope va timeline.</p><div className="mt-4 flex gap-2"><Button>Accept</Button><Button variant="secondary">Send proposal</Button><Button variant="danger">Reject</Button></div></Card>)}</Section></Dashboard>;
}

export function PremiumPage() {
  const { data = [] } = useQuery({ queryKey: ['plans'], queryFn: endpoints.premiumPlans });
  return <Dashboard title="Designer Premium"><div className="grid gap-4 md:grid-cols-3">{data.filter((p: any) => p.roleTarget !== 'client').map((p: any) => <Card key={p._id}><Badge tone="premium">Premium</Badge><h2 className="mt-3 text-2xl font-black">{p.name}</h2><p className="text-2xl font-black">{p.price?.toLocaleString('vi-VN')}d</p><Button className="mt-5">Nang cap</Button></Card>)}</div></Dashboard>;
}
