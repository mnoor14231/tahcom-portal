import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role, User } from '../types.ts';
import { loadState, saveState } from '../data/seed.ts';

type SessionUser = Pick<User, 'id' | 'username' | 'displayName' | 'role' | 'departmentCode' | 'canCreateTasks' | 'status' | 'requirePasswordChange'>;

interface AuthContextValue {
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; requirePasswordChange?: boolean }>;
  logout: () => void;
  changePassword: (newPassword: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_PASSWORD = '123';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    async login(username: string, password: string) {
      const state = loadState();
      const foundUser = state.users.find(x => x.username.toLowerCase() === username.toLowerCase());
      
      if (!foundUser) return { ok: false, error: 'Invalid credentials' };
      
      // Check password: either stored password or default "123"
      const expectedPassword = foundUser.password || DEFAULT_PASSWORD;
      if (password !== expectedPassword) return { ok: false, error: 'Invalid credentials' };
      
      const sessionUser: SessionUser = {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName,
        role: foundUser.role,
        departmentCode: foundUser.departmentCode,
        canCreateTasks: foundUser.canCreateTasks,
        status: foundUser.status,
        requirePasswordChange: foundUser.requirePasswordChange,
      };
      
      setUser(sessionUser);
      return { 
        ok: true, 
        requirePasswordChange: foundUser.requirePasswordChange === true 
      };
    },
    logout() { setUser(null); },
    changePassword(newPassword: string) {
      if (!user) return;
      
      const state = loadState();
      const updatedUsers = state.users.map(u => 
        u.id === user.id 
          ? { ...u, password: newPassword, requirePasswordChange: false }
          : u
      );
      
      saveState({ ...state, users: updatedUsers });
      setUser(prev => prev ? { ...prev, requirePasswordChange: false } : null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasRole(user: SessionUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}


