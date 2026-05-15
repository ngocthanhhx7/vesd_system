import { useQuery } from '@tanstack/react-query';
import { Clock, CreditCard, FolderKanban, Users } from 'lucide-react';
import { EmptyState } from '../../components/ui/Primitives';
import { endpoints } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

export function ClientDashboard() {
  const { data = [] } = useQuery({ queryKey: ['my-projects'], queryFn: endpoints.myProjects });

  return (
    <Dashboard title="Client Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Active projects" value={data.filter((p: any) => p.status !== 'completed').length} icon={FolderKanban} />
        <Metric label="Pending approvals" value={data.filter((p: any) => p.status === 'submitted').length} icon={Clock} />
        <Metric label="Total spent" value="18M" icon={CreditCard} />
        <Metric label="Saved designers" value="12" icon={Users} />
      </div>
      <Section title="Du an gan day">
        {data.length ? data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />) : <EmptyState title="Chua co du an" />}
      </Section>
    </Dashboard>
  );
}
