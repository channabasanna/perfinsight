import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '../api/client';
import { UserRole } from '../types';

interface AuthState {
  token: string | null;
  username: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    username: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_username');
    const storedRole = localStorage.getItem('auth_role') as UserRole | null;
    if (stored && storedUser) {
      client.get('/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
        .then((res) => {
          const role: UserRole = res.data?.data?.role || storedRole || 'user';
          localStorage.setItem('auth_role', role);
          setState({ token: stored, username: storedUser, role, isAuthenticated: true, isLoading: false });
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_username');
          localStorage.removeItem('auth_role');
          setState({ token: null, username: null, role: null, isAuthenticated: false, isLoading: false });
        });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await client.post<{ success: boolean; data: { token: string; username: string; role: UserRole } }>(
      '/auth/login',
      { username, password }
    );
    const { token, username: user, role } = res.data.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_username', user);
    localStorage.setItem('auth_role', role);
    setState({ token, username: user, role, isAuthenticated: true, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    setState({ token: null, username: null, role: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, isAdmin: state.role === 'admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
