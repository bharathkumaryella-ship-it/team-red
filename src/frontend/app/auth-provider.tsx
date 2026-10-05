'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authApi, type User } from '../lib/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { full_name: string; email: string; phone: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authApi.me().then((current) => { if (active) setUser(current); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    const requiredRole = pathname.startsWith('/admin') ? 'ADMIN'
      : pathname.startsWith('/doctor') ? 'DOCTOR'
      : pathname.startsWith('/patient') ? 'PATIENT' : null;
    if (requiredRole && !user) router.replace('/login');
    else if (requiredRole && user && user.role !== requiredRole) router.replace('/');
  }, [loading, pathname, router, user]);

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await authApi.login({ email, password });
    setUser(authenticated);
    return authenticated;
  }, []);
  const register = useCallback(async (input: { full_name: string; email: string; phone: string; password: string }) => {
    const created = await authApi.register(input);
    const authenticated = await authApi.login({ email: input.email, password: input.password });
    setUser(authenticated);
    return created;
  }, []);
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
