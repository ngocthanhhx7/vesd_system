import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Primitives';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="auth-bg flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-8 md:min-h-screen">
      <Helmet><title>{title} | VESD</title></Helmet>
      <Card className="auth-card-mobile max-w-md rounded-xl border-0 bg-white p-5 shadow-2xl sm:p-8">
        {children}
      </Card>
    </main>
  );
}
