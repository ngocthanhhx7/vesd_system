import { Outlet } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
