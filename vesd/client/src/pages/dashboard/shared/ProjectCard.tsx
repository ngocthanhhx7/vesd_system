import { Link } from 'react-router-dom';
import { Badge, Card, StatusBadge } from '../../../components/ui/Primitives';
import { useAuth } from '../../../hooks/useAuth';

export function ProjectCard({ project }: { project: any }) {
  const { user } = useAuth();
  const workspaceBase = user?.roles.includes('designer') ? '/designer/workspace' : '/client/workspace';
  const budget = project.budget?.agreed || project.budget?.max || project.budget?.min || 0;

  return (
    <Card className="border-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{project.title}</h3>
          <p className="text-base text-muted">{project.category}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {project.priorityLevel === 'premium' && <Badge tone="premium">Ưu tiên Premium</Badge>}
          <StatusBadge status={project.status} />
        </div>
      </div>
      {project.description && <p className="mt-3 line-clamp-2 text-base text-muted">{project.description}</p>}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-soft p-3 text-base">
        <span className="font-bold text-brand">{budget ? `${budget.toLocaleString('vi-VN')}đ` : 'Trao đổi'}</span>
        <Link className="font-semibold text-brand" to={`${workspaceBase}/${project._id}`}>Mở không gian làm việc</Link>
      </div>
    </Card>
  );
}

