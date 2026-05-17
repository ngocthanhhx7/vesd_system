import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Primitives';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="auth-bg min-h-screen flex items-center justify-center p-4">
      <Helmet><title>{title} | VESD</title></Helmet>
      <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 border-0">
        {children}
      </Card>
    </main>
  );
}
