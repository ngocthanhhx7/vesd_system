import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Primitives';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="blue-grid grid min-h-[calc(100vh-130px)] place-items-center py-10">
      <Helmet><title>{title} | VESD</title></Helmet>
      <Card className="w-[min(440px,calc(100%-32px))] border-0 shadow-2xl">
        <img src="/assets/vesd-logo-blue.svg" alt="VESD" className="mb-6 h-10 w-auto" />
        <h1 className="mb-6 text-2xl font-black">{title}</h1>
        {children}
      </Card>
    </main>
  );
}
