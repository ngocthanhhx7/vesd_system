import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, FolderKanban, Users } from 'lucide-react';
import { Card, EmptyState, StatusBadge } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

export function ClientDashboard() {
  const { data = [] } = useQuery({ queryKey: ['my-projects'], queryFn: endpoints.myProjects });
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: endpoints.dashboardSummary });
  const pendingReview = data.filter((p: any) => ['submitted', 'final_submitted'].includes(p.status));
  const needsPayment = data.filter((p: any) => p.status === 'payment_pending');
  const active = data.filter((p: any) => !['completed', 'cancelled'].includes(p.status));

  return (
    <Dashboard title="Tổng quan khách hàng">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Dự án đang chạy" value={summary?.activeProjects ?? data.filter((p: any) => p.status !== 'completed').length} icon={FolderKanban} />
        <Metric label="Chờ duyệt" value={summary?.pendingApprovals ?? data.filter((p: any) => p.status === 'submitted').length} icon={Clock} />
        <Metric label="Tổng chi tiêu" value={(summary?.totalSpent || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Designer đã lưu" value="12" icon={Users} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Việc cần xử lý</h2>
            <Link to="/client/create-project"><Button>Đăng dự án</Button></Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Chờ duyệt file</p><p className="text-2xl font-black">{pendingReview.length}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Chờ escrow</p><p className="text-2xl font-black">{needsPayment.length}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Đang theo dõi</p><p className="text-2xl font-black">{active.length}</p></div>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Hàng đợi dự án</h2>
          <div className="mt-4 space-y-3">
            {active.slice(0, 3).map((project: any) => (
              <Link key={project._id} to={`/client/workspace/${project._id}`} className="block rounded-lg bg-soft p-3 transition hover:bg-pale">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{project.title}</p>
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
            {!active.length && <p className="text-base text-muted">Chưa có dự án đang xử lý.</p>}
          </div>
        </Card>
      </div>
      <Section title="Dự án gần đây">
        {data.length ? data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />) : <EmptyState title="Chưa có dự án" />}
      </Section>
    </Dashboard>
  );
}

