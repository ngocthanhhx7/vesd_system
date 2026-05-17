import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ApiUser, endpoints, setToken } from '../services/api';

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (body: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  updateUser: (user: ApiUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    endpoints
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => {
      const data = await endpoints.login({ email, password });
      setToken(data.token);
      setUser(data.user);
    },
    register: async (body) => {
      const data = await endpoints.register(body);
      setToken(data.token);
      setUser(data.user);
    },
    loginWithGoogle: async (credential) => {
      const data = await endpoints.loginGoogle(credential);
      setToken(data.token);
      setUser(data.user);
    },
    logout: () => {
      setToken(null);
      setUser(null);
    },
    hasRole: (role) => Boolean(user?.roles.includes(role)),
    updateUser: (nextUser) => setUser(nextUser)
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
