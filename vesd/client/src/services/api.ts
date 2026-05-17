const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export type ApiUser = {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  avatar?: string;
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
  login: (body: unknown) => api<{ user: ApiUser; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginGoogle: (credential: string) => api<{ user: ApiUser; token: string }>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  register: (body: unknown) => api<{ user: ApiUser; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  myProjects: () => api<any[]>('/projects/my'),
  createProject: (body: unknown) => api<any>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  project: (id: string) => api<any>(`/projects/${id}`),
  wallet: () => api<any>('/wallet/my'),
  transactions: () => api<any[]>('/transactions/my'),
  premiumPlans: (query = '') => api<PremiumPlan[]>(`/premium/plans${query}`),
  activeDiscounts: (query = '') => api<any[]>(`/discounts/active${query}`),
  validateDiscount: (body: unknown) => api<any>('/discounts/validate', { method: 'POST', body: JSON.stringify(body) }),
  subscribe: (body: unknown) => api<any>('/premium/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  premiumMy: () => api<any[]>('/premium/my'),
  adminUsers: () => api<any[]>('/admin/users'),
  adminProjects: () => api<any[]>('/admin/projects'),
  adminDisputes: () => api<any[]>('/admin/disputes')
};
