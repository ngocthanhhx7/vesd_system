import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './hooks/useAuth';
import { DashboardLayout, Protected, PublicLayout } from './components/layout/Layout';
import { CategoryPage, DesignerProfilePage, DesignersPage, HelpPage, HomePage, PricingPage } from './pages/PublicPages';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, RoleSelectionPage } from './pages/AuthPages';
import {
  AdminDashboard,
  AdminListPage,
  AdminSimplePage,
  AgreementPage,
  ChecklistPage,
  ClientDashboard,
  CreateProjectPage,
  DesignerDashboard,
  DesignerProfileSetup,
  EscrowPage,
  MatchingPage,
  PortfolioManager,
  PremiumPage,
  RequestsPage,
  ReviewsPage,
  SettingsPage,
  WalletPage,
  WorkspacePage
} from './pages/DashboardPages';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
});

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/designers', element: <DesignersPage /> },
      { path: '/designers/:slug', element: <DesignerProfilePage /> },
      { path: '/services/:slug', element: <CategoryPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/help', element: <HelpPage /> },
      { path: '/help/:topic', element: <HelpPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/role-selection', element: <RoleSelectionPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> }
    ]
  },
  {
    element: <Protected role="client" />,
    children: [{
      element: <DashboardLayout role="client" />,
      path: '/client',
      children: [
        { index: true, element: <ClientDashboard /> },
        { path: 'create-project', element: <CreateProjectPage /> },
        { path: 'matching', element: <MatchingPage /> },
        { path: 'agreement', element: <AgreementPage /> },
        { path: 'escrow', element: <EscrowPage /> },
        { path: 'workspace/:id', element: <WorkspacePage /> },
        { path: 'checklist', element: <ChecklistPage /> },
        { path: 'wallet', element: <WalletPage /> },
        { path: 'reviews', element: <ReviewsPage /> },
        { path: 'settings', element: <SettingsPage /> }
      ]
    }]
  },
  {
    element: <Protected role="designer" />,
    children: [{
      element: <DashboardLayout role="designer" />,
      path: '/designer',
      children: [
        { index: true, element: <DesignerDashboard /> },
        { path: 'profile', element: <DesignerProfileSetup /> },
        { path: 'portfolio', element: <PortfolioManager /> },
        { path: 'requests', element: <RequestsPage /> },
        { path: 'workspace/:id', element: <WorkspacePage designer /> },
        { path: 'earnings', element: <WalletPage /> },
        { path: 'premium', element: <PremiumPage /> },
        { path: 'settings', element: <SettingsPage /> }
      ]
    }]
  },
  {
    element: <Protected role="admin" />,
    children: [{
      element: <DashboardLayout role="admin" />,
      path: '/admin',
      children: [
        { index: true, element: <AdminDashboard /> },
        { path: 'users', element: <AdminListPage type="users" /> },
        { path: 'verification', element: <AdminSimplePage title="Designer Verification Dashboard" /> },
        { path: 'projects', element: <AdminListPage type="projects" /> },
        { path: 'escrow', element: <AdminSimplePage title="Escrow / Transaction Management" /> },
        { path: 'disputes', element: <AdminListPage type="disputes" /> },
        { path: 'reviews', element: <AdminSimplePage title="Review / Report Management" /> },
        { path: 'checklists', element: <AdminSimplePage title="Checklist Management" /> },
        { path: 'premium', element: <AdminSimplePage title="Premium Package Management" /> },
        { path: 'settings', element: <AdminSimplePage title="Admin Settings" /> }
      ]
    }]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </HelmetProvider>
);
