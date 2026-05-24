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
  AdminDiscountsPage,
  AdminListPage,
  AdminSimplePage,
  AdminWithdrawalsPage,
  AgreementPage,
  ChecklistPage,
  ChangePasswordPage,
  ClientDashboard,
  CreateProjectPage,
  DesignerDashboard,
  DesignerProfileSetup,
  EscrowPage,
  MatchingPage,
  MessagesPage,
  PortfolioManager,
  PremiumPage,
  RequestsPage,
  ReviewsPage,
  SettingsPage,
  WalletPage,
  WalletTopupPage,
  WalletWithdrawPage,
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
        { path: 'messages', element: <MessagesPage /> },
        { path: 'messages/:id', element: <MessagesPage /> },
        { path: 'agreement', element: <AgreementPage /> },
        { path: 'escrow', element: <EscrowPage /> },
        { path: 'workspace/:id', element: <WorkspacePage /> },
        { path: 'checklist', element: <ChecklistPage /> },
        { path: 'wallet', element: <WalletPage /> },
        { path: 'wallet/topup', element: <WalletTopupPage /> },
        { path: 'wallet/withdraw', element: <WalletWithdrawPage /> },
        { path: 'premium', element: <PremiumPage roleTarget="client" /> },
        { path: 'reviews', element: <ReviewsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'password', element: <ChangePasswordPage /> }
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
        { path: 'messages', element: <MessagesPage /> },
        { path: 'messages/:id', element: <MessagesPage /> },
        { path: 'requests', element: <RequestsPage /> },
        { path: 'workspace/:id', element: <WorkspacePage designer /> },
        { path: 'earnings', element: <WalletPage /> },
        { path: 'earnings/topup', element: <WalletTopupPage /> },
        { path: 'earnings/withdraw', element: <WalletWithdrawPage /> },
        { path: 'premium', element: <PremiumPage roleTarget="designer" /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'password', element: <ChangePasswordPage /> }
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
        { path: 'verification', element: <AdminSimplePage title="Xác minh designer" /> },
        { path: 'projects', element: <AdminListPage type="projects" /> },
        { path: 'escrow', element: <AdminSimplePage title="Quản lý escrow và giao dịch" /> },
        { path: 'withdrawals', element: <AdminWithdrawalsPage /> },
        { path: 'disputes', element: <AdminListPage type="disputes" /> },
        { path: 'reviews', element: <AdminSimplePage title="Review / Report Management" /> },
        { path: 'checklists', element: <AdminSimplePage title="Checklist Management" /> },
        { path: 'premium', element: <AdminSimplePage title="Premium Package Management" /> },
        { path: 'discounts', element: <AdminDiscountsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'password', element: <ChangePasswordPage /> }
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
