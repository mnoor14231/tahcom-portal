import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Role } from '../types.ts';
import { supabase } from '../lib/supabaseClient.ts';

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  departmentCode?: string;
  canCreateTasks?: boolean;
  status: 'active' | 'disabled';
  requirePasswordChange?: boolean;
};

interface AuthContextValue {
  user: SessionUser | null;
  initializing: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; requirePasswordChange?: boolean }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USERNAME_DOMAIN = import.meta.env.VITE_SUPABASE_USERNAME_DOMAIN ?? 'tahcom.local';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  role: Role;
  department_code: string | null;
  status: 'active' | 'disabled';
  can_create_tasks: boolean | null;
  require_password_change: boolean | null;
}

function toSessionUser(profile: ProfileRow): SessionUser {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    role: profile.role,
    departmentCode: profile.department_code ?? undefined,
    canCreateTasks: profile.can_create_tasks ?? undefined,
    status: profile.status,
    requirePasswordChange: profile.require_password_change ?? undefined,
  };
}

async function fetchSessionUser(userId: string): Promise<SessionUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, department_code, status, can_create_tasks, require_password_change')
    .eq('id', userId)
    .single<ProfileRow>();

  if (error) {
    console.error('[Supabase] Failed to load profile', error);
    return null;
  }

  return toSessionUser(data);
}

function buildEmailFromUsername(username: string): string {
  const value = username.trim();
  if (value.includes('@')) return value;
  return `${value}@${USERNAME_DOMAIN}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (session: Session | null) => {
      if (!isMounted) return;

      if (session?.user) {
        const profileUser = await fetchSessionUser(session.user.id);
        if (profileUser?.status === 'disabled') {
          await supabase.auth.signOut();
          if (isMounted) setUser(null);
          return;
        }
        if (profileUser && isMounted) {
          setUser(profileUser);
        }
      } else {
        setUser(null);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .finally(() => {
        if (isMounted) setInitializing(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session).finally(() => {
        if (isMounted) setInitializing(false);
      });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    async login(username: string, password: string) {
      const email = buildEmailFromUsername(username);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        return { ok: false, error: 'Invalid credentials' };
      }

      const sessionUser = await fetchSessionUser(data.session.user.id);
      if (!sessionUser) {
        await supabase.auth.signOut();
        return { ok: false, error: 'Profile missing for this account' };
      }

      if (sessionUser.status === 'disabled') {
        await supabase.auth.signOut();
        return { ok: false, error: 'Account is disabled. Contact your administrator.' };
      }

      setUser(sessionUser);
      return {
        ok: true,
        requirePasswordChange: sessionUser.requirePasswordChange === true
      };
    },
    async logout() {
      await supabase.auth.signOut();
      setUser(null);
    },
    async changePassword(newPassword: string) {
      if (!user) {
        return { ok: false, error: 'No active session' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { ok: false, error: error.message };
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ require_password_change: false })
        .eq('id', user.id);

      if (profileError) {
        console.warn('[Supabase] Failed to update profile after password change', profileError);
      }

      setUser(prev => prev ? { ...prev, requirePasswordChange: false } : null);
      return { ok: true };
    },
  }), [user, initializing]);

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


