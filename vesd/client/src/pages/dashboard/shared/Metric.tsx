import { Card } from '../../../components/ui/Primitives';

export function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-soft" />
      <Icon className="relative text-brand" />
      <p className="relative mt-3 text-base text-muted">{label}</p>
      <p className="relative text-2xl font-black">{value}</p>
    </Card>
  );
}
