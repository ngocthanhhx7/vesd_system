import { Card } from '../../../components/ui/Primitives';

export function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="dashboard-metric relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/10" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-soft text-brand shadow-[inset_2px_2px_5px_rgba(148,163,184,.24),inset_-2px_-2px_5px_rgba(255,255,255,.9)]">
        <Icon size={22} />
      </div>
      <p className="relative mt-4 text-sm font-semibold uppercase text-muted">{label}</p>
      <p className="relative mt-1 text-3xl font-black">{value}</p>
    </Card>
  );
}
