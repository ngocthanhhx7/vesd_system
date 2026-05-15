import { Outlet } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardRole } from './dashboardNavigation';

export function DashboardLayout({ role }: { role: DashboardRole }) {
  return (
    <div className="min-h-screen bg-soft">
      <DashboardSidebar role={role} />
      <main className="lg:pl-64">
        <DashboardHeader role={role} />
        <div className="p-4 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
