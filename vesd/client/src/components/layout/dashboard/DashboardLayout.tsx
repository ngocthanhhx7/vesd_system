import { Outlet } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardRole } from './dashboardNavigation';

export function DashboardLayout({ role }: { role: DashboardRole }) {
  return (
    <div className="min-h-screen bg-soft">
      <DashboardSidebar role={role} />
      <main className="min-w-0 lg:pl-64">
        <DashboardHeader role={role} />
        <div className="min-w-0 p-4 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
