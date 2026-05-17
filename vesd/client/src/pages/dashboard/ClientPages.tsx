import { useQuery } from '@tanstack/react-query';
import { Clock, CreditCard, FolderKanban, Users } from 'lucide-react';
import { EmptyState } from '../../components/ui/Primitives';
import { endpoints } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

export function ClientDashboard() {
  const { data = [] } = useQuery({ queryKey: ['my-projects'], queryFn: endpoints.myProjects });
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: endpoints.dashboardSummary });

  return (
    <Dashboard title="Tổng quan khách hàng">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Dự án đang chạy" value={summary?.activeProjects ?? data.filter((p: any) => p.status !== 'completed').length} icon={FolderKanban} />
        <Metric label="Chờ duyệt" value={summary?.pendingApprovals ?? data.filter((p: any) => p.status === 'submitted').length} icon={Clock} />
        <Metric label="Tổng chi tiêu" value={(summary?.totalSpent || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Designer đã lưu" value="12" icon={Users} />
      </div>
      <Section title="Dự án gần đây">
        {data.length ? data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />) : <EmptyState title="Chưa có dự án" />}
      </Section>
    </Dashboard>
  );
}
