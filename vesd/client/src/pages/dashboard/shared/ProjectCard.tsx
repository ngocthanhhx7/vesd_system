import { Link } from 'react-router-dom';
import { Badge, Card, StatusBadge } from '../../../components/ui/Primitives';

export function ProjectCard({ project }: { project: any }) {
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
      <div className="mt-4 flex items-center justify-between rounded-lg bg-soft p-3 text-base">
        <span className="font-bold text-brand">{project.budget?.agreed?.toLocaleString('vi-VN') || project.budget?.max?.toLocaleString('vi-VN')}d</span>
        <Link className="font-semibold text-brand" to={`workspace/${project._id}`}>Mo workspace</Link>
      </div>
    </Card>
  );
}
