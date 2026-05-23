const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export type ApiUser = {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  emailVerified?: boolean;
  status?: string;
};

export type PremiumPlan = {
  _id: string;
  code: 'designer_premium' | 'business_premium';
  name: string;
  roleTarget: 'client' | 'designer' | 'both';
  price: number;
  durationDays: number;
  benefits: string[];
  isActive: boolean;
};

export function getToken() {
  return localStorage.getItem('vesd_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('vesd_token', token);
  else localStorage.removeItem('vesd_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Loi ket noi API');
  return data as T;
}

export const endpoints = {
  designers: (query = '') => api<any>(`/designers${query}`),
  designer: (id: string) => api<any>(`/designers/${id}`),
  publicStats: () => api<any>('/stats/public'),
  dashboardSummary: () => api<any>('/dashboard/summary'),
  me: () => api<{ user: ApiUser }>('/auth/me'),
  myAccount: () => api<{ user: ApiUser; clientProfile?: any; designerProfile?: any }>('/users/me'),
  updateMe: (body: unknown) => api<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body: unknown) => api<any>('/users/me/password', { method: 'PATCH', body: JSON.stringify(body) }),
  login: (body: unknown) => api<{ user: ApiUser; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginGoogle: (credential: string) => api<{ user: ApiUser; token: string }>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  register: (body: unknown) => api<{ user: ApiUser; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  myProjects: () => api<any[]>('/projects/my'),
  createProject: (body: unknown) => api<any>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  project: (id: string) => api<any>(`/projects/${id}`),
  payEscrow: (body: unknown) => api<any>('/payments/escrow', { method: 'POST', body: JSON.stringify(body) }),
  syncPayosPayment: (orderCode: string | number) => api<any>(`/payments/payos/${orderCode}/sync`, { method: 'POST' }),
  wallet: () => api<any>('/wallet/my'),
  topUpWallet: (body: unknown) => api<any>('/wallet/topup', { method: 'POST', body: JSON.stringify(body) }),
  transferToDesigner: (body: unknown) => api<any>('/wallet/transfers/designer', { method: 'POST', body: JSON.stringify(body) }),
  transactions: () => api<any[]>('/transactions/my'),
  withdrawals: () => api<any[]>('/withdrawals/my'),
  createWithdrawal: (body: unknown) => api<any>('/withdrawals', { method: 'POST', body: JSON.stringify(body) }),
  syncWithdrawal: (id: string) => api<any>(`/withdrawals/${id}/sync`, { method: 'POST' }),
  premiumPlans: (query = '') => api<PremiumPlan[]>(`/premium/plans${query}`),
  activeDiscounts: (query = '') => api<any[]>(`/discounts/active${query}`),
  validateDiscount: (body: unknown) => api<any>('/discounts/validate', { method: 'POST', body: JSON.stringify(body) }),
  subscribe: (body: unknown) => api<any>('/premium/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  premiumMy: () => api<any[]>('/premium/my'),
  adminUsers: () => api<any[]>('/admin/users'),
  adminProjects: () => api<any[]>('/admin/projects'),
  adminDisputes: () => api<any[]>('/admin/disputes'),
  adminDiscounts: () => api<any[]>('/admin/discounts'),
  createDiscount: (body: unknown) => api<any>('/admin/discounts', { method: 'POST', body: JSON.stringify(body) }),
  updateDiscount: (id: string, body: unknown) => api<any>(`/admin/discounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
};
