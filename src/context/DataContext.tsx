import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type {
  ActivityLog,
  AppState,
  Department,
  KPI,
  KPIHistoryEntry,
  Notification,
  Task,
  User
} from '../types.ts';
import { loadState, saveState } from '../data/seed.ts';
import { supabase } from '../lib/supabaseClient.ts';
import { useAuth } from './AuthContext.tsx';
import { buildAdminApiUrl } from '../utils/apiBase.ts';
import { KpiCompletionModal } from '../components/modals/KpiCompletionModal.tsx';

interface DataContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  // Helpers
  updateKpi: (kpi: KPI) => void;
  addKpi: (kpi: KPI) => void;
  deleteKpi: (id: string) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  setPreviewDepartment: (code: string) => void;
  addActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => Notification;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  removeNotification: (notificationId: string) => void;
  refreshDirectory: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const SUPABASE_CONFIGURED =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

interface TaskRow {
  id: string;
  department_code: string;
  title: string;
  description: string | null;
  assignee_user_ids: string[] | null;
  due_date: string | null;
  priority: Task['priority'];
  status: Task['status'];
  related_kpi_id: string | null;
  comments: Task['comments'] | null;
  attachments: Task['attachments'] | null;
  progress_percent: number | null;
}

interface ActivityRow {
  id: string;
  department_code: string;
  user_id: string;
  type: ActivityLog['type'];
  timestamp: string;
  description: string;
  related_task_id: string | null;
  related_kpi_id: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: Notification['type'];
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  related_task_id: string | null;
  related_kpi_id: string | null;
}

interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  manager_user_id: string | null;
  status: Department['status'];
  created_at?: string | null;
  updated_at?: string | null;
}

interface KpiRow {
  id: string;
  department_code: string;
  name: string;
  description: string | null;
  unit: string;
  target: number;
  current_value: number;
  owner_user_id: string | null;
  last_updated: string;
  timeframe: string | null;
  period_start_date: string | null;
}

interface KpiHistoryRow {
  id: string;
  kpi_id: string;
  timestamp: string;
  user_id: string;
  field: KPIHistoryEntry['field'];
  old_value: string;
  new_value: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  role: User['role'];
  department_code: string | null;
  status: User['status'];
  can_create_tasks: boolean | null;
  require_password_change: boolean | null;
  specialty: string | null;
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    departmentCode: row.department_code,
    title: row.title,
    description: row.description ?? undefined,
    assigneeUserIds: row.assignee_user_ids ?? [],
    dueDate: row.due_date ?? undefined,
    priority: row.priority,
    status: row.status,
    relatedKpiId: row.related_kpi_id ?? undefined,
    comments: row.comments ?? [],
    attachments: row.attachments ?? [],
    progressPercent: row.progress_percent ?? undefined,
  };
}

function mapTaskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    department_code: task.departmentCode,
    title: task.title,
    description: task.description ?? null,
    assignee_user_ids: task.assigneeUserIds ?? [],
    due_date: task.dueDate ?? null,
    priority: task.priority,
    status: task.status,
    related_kpi_id: task.relatedKpiId ?? null,
    comments: task.comments ?? [],
    attachments: task.attachments ?? [],
    progress_percent: task.progressPercent ?? null,
  };
}

function mapActivityRow(row: ActivityRow): ActivityLog {
  return {
    id: row.id,
    departmentCode: row.department_code,
    userId: row.user_id,
    type: row.type,
    timestamp: row.timestamp,
    description: row.description,
    relatedTaskId: row.related_task_id ?? undefined,
    relatedKpiId: row.related_kpi_id ?? undefined,
  };
}

function mapActivityToRow(activity: ActivityLog): ActivityRow {
  return {
    id: activity.id,
    department_code: activity.departmentCode,
    user_id: activity.userId,
    type: activity.type,
    timestamp: activity.timestamp,
    description: activity.description,
    related_task_id: activity.relatedTaskId ?? null,
    related_kpi_id: activity.relatedKpiId ?? null,
  };
}

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    timestamp: row.timestamp,
    isRead: row.is_read,
    relatedTaskId: row.related_task_id ?? undefined,
    relatedKpiId: row.related_kpi_id ?? undefined,
  };
}

function mapNotificationToRow(notification: Notification): NotificationRow {
  return {
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp,
    is_read: notification.isRead,
    related_task_id: notification.relatedTaskId ?? null,
    related_kpi_id: notification.relatedKpiId ?? null,
  };
}

function mapDepartmentRow(row: DepartmentRow): Department {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    managerUserId: row.manager_user_id ?? undefined,
    status: row.status,
  };
}

function mapDepartmentToRow(department: Department): DepartmentRow {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    manager_user_id: department.managerUserId ?? null,
    status: department.status,
  };
}

function mapKpiRow(row: KpiRow): KPI {
  return {
    id: row.id,
    departmentCode: row.department_code,
    name: row.name,
    description: row.description ?? undefined,
    unit: row.unit,
    target: row.target,
    currentValue: row.current_value,
    ownerUserId: row.owner_user_id ?? undefined,
    lastUpdated: row.last_updated,
    timeframe: (row.timeframe as KPI['timeframe']) ?? undefined,
    periodStartDate: row.period_start_date ?? undefined,
  };
}

function mapKpiHistoryRow(row: KpiHistoryRow): KPIHistoryEntry {
  return {
    id: row.id,
    kpiId: row.kpi_id,
    timestamp: row.timestamp,
    userId: row.user_id,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
  };
}

function mapKpiHistoryToRow(history: KPIHistoryEntry): KpiHistoryRow {
  return {
    id: history.id,
    kpi_id: history.kpiId,
    timestamp: history.timestamp,
    user_id: history.userId,
    field: history.field,
    old_value: history.oldValue,
    new_value: history.newValue,
  };
}

function mapProfileRow(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    role: row.role,
    departmentCode: row.department_code ?? undefined,
    status: row.status,
    canCreateTasks: row.can_create_tasks ?? undefined,
    requirePasswordChange: row.require_password_change ?? undefined,
    specialty: row.specialty ?? undefined,
  };
}

function mapProfileToRow(user: User): ProfileRow {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    role: user.role,
    department_code: user.departmentCode ?? null,
    status: user.status,
    can_create_tasks: user.canCreateTasks ?? null,
    require_password_change: user.requirePasswordChange ?? null,
    specialty: user.specialty ?? null,
  };
}

function diffCollection<T extends { id: string }>(prev: T[], next: T[]) {
  const prevMap = new Map(prev.map(item => [item.id, item]));
  const nextMap = new Map(next.map(item => [item.id, item]));

  const upserts: T[] = [];
  const deletes: string[] = [];

  for (const [id, nextItem] of nextMap) {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      upserts.push(nextItem);
      continue;
    }
    if (JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
      upserts.push(nextItem);
    }
  }

  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) {
      deletes.push(id);
    }
  }

  return { upserts, deletes };
}

async function syncTasks(prev: Task[], next: Task[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('tasks').upsert(upserts.map(mapTaskToRow));
    if (error) console.warn('[Supabase] Failed to upsert tasks', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('tasks').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete tasks', error);
  }
}

async function syncActivities(prev: ActivityLog[], next: ActivityLog[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('activities').upsert(upserts.map(mapActivityToRow));
    if (error) console.warn('[Supabase] Failed to upsert activities', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('activities').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete activities', error);
  }
}

async function syncNotifications(prev: Notification[], next: Notification[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('notifications').upsert(upserts.map(mapNotificationToRow));
    if (error) console.warn('[Supabase] Failed to upsert notifications', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('notifications').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete notifications', error);
  }
}

async function syncDepartments(prev: Department[], next: Department[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('departments').upsert(upserts.map(mapDepartmentToRow));
    if (error) console.warn('[Supabase] Failed to upsert departments', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('departments').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete departments', error);
  }
}

async function syncUsers(prev: User[], next: User[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('profiles').upsert(upserts.map(mapProfileToRow));
    if (error) console.warn('[Supabase] Failed to upsert users', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('profiles').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete users', error);
  }
}

async function syncKpiHistory(prev: KPIHistoryEntry[], next: KPIHistoryEntry[]) {
  if (!SUPABASE_CONFIGURED) return;
  const { upserts, deletes } = diffCollection(prev, next);

  if (upserts.length) {
    const { error } = await supabase.from('kpi_history').upsert(upserts.map(mapKpiHistoryToRow));
    if (error) console.warn('[Supabase] Failed to upsert KPI history', error);
  }

  if (deletes.length) {
    const { error } = await supabase.from('kpi_history').delete().in('id', deletes);
    if (error) console.warn('[Supabase] Failed to delete KPI history', error);
  }
}

// Utility function to check if a KPI period has ended
function hasPeriodEnded(kpi: KPI): boolean {
  if (!kpi.timeframe || !kpi.periodStartDate) return false;
  
  const now = new Date();
  const periodStart = new Date(kpi.periodStartDate);
  
  switch (kpi.timeframe) {
    case 'Daily': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDay = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
      return today > startDay;
    }
    case 'Weekly': {
      const weekStart = new Date(periodStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      return currentWeekStart > weekStart;
    }
    case 'Monthly': {
      return now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear();
    }
    case 'Quarterly': {
      const startQuarter = Math.floor(periodStart.getMonth() / 3);
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return now.getFullYear() > periodStart.getFullYear() || 
             (now.getFullYear() === periodStart.getFullYear() && currentQuarter > startQuarter);
    }
    case 'Annually': {
      return now.getFullYear() > periodStart.getFullYear();
    }
    default:
      return false;
  }
}

async function hydrateFromSupabase() {
  if (!SUPABASE_CONFIGURED) return null;

  const [
    { data: departmentRows, error: departmentError },
    { data: profileRows, error: profileError },
    { data: kpiRows, error: kpiError },
    { data: kpiHistoryRows, error: historyError },
    { data: taskRows, error: taskError },
    { data: activityRows, error: activityError },
    { data: notificationRows, error: notificationError },
  ] = await Promise.all([
    supabase.from('departments').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('kpis').select('*'),
    supabase.from('kpi_history').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('notifications').select('*'),
  ]);

  if (departmentError || profileError || kpiError || historyError || taskError || activityError || notificationError) {
    console.warn('[Supabase] Failed to load initial data', departmentError || profileError || kpiError || historyError || taskError || activityError || notificationError);
    return null;
  }

  return {
    departments: (departmentRows ?? []).map(mapDepartmentRow),
    users: (profileRows ?? []).map(mapProfileRow),
    kpis: (kpiRows ?? []).map(mapKpiRow),
    kpiHistory: (kpiHistoryRows ?? []).map(mapKpiHistoryRow),
    tasks: (taskRows ?? []).map(mapTaskRow),
    activities: (activityRows ?? []).map(mapActivityRow),
    notifications: (notificationRows ?? []).map(mapNotificationRow),
  };
}

// Helper to check if localStorage is available (works in PWA)
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__localStorage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Helper to get seen completions from localStorage (PWA-compatible)
function getSeenCompletions(userId: string): Set<string> {
  if (typeof window === 'undefined' || !userId || !isLocalStorageAvailable()) return new Set();
  try {
    const stored = window.localStorage.getItem(`kpi-completions-seen-${userId}`);
    if (!stored) return new Set();
    const data = JSON.parse(stored);
    return new Set(data.completedKpiIds || []);
  } catch (error) {
    console.warn('[KPI Completion] Failed to read seen completions:', error);
    return new Set();
  }
}

// Helper to mark a completion as seen (PWA-compatible)
function markCompletionAsSeen(userId: string, kpiId: string) {
  if (typeof window === 'undefined' || !userId || !isLocalStorageAvailable()) return;
  try {
    const seen = getSeenCompletions(userId);
    seen.add(kpiId);
    window.localStorage.setItem(`kpi-completions-seen-${userId}`, JSON.stringify({
      completedKpiIds: Array.from(seen),
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('[KPI Completion] Failed to save seen completion:', error);
    // Ignore storage errors - PWA will still work, just won't remember seen completions
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setLocalState] = useState<AppState>(() => loadState());
  const { user, initializing } = useAuth();
  const pendingSync = useRef<Promise<void> | null>(null);
  const [completedKpi, setCompletedKpi] = useState<KPI | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if ((!token || error) && typeof supabase.auth.refreshSession === 'function') {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session?.access_token) {
        throw new Error('session_expired');
      }
      token = refreshData.session.access_token;
    }

    if (!token) throw new Error('session_missing');
    return token;
  };

  const callAdminKpi = async (method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: any) => {
    try {
      const token = await getAccessToken();
      const response = await fetch(buildAdminApiUrl(path), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = payload.error || `kpi_${method.toLowerCase()}_failed`;
        throw new Error(error);
      }
    } catch (err) {
      console.warn('[DataContext] KPI admin call failed', err);
    }
  };

  const refreshFromRemote = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    const remote = await hydrateFromSupabase();
    if (!remote) return;

    setLocalState(prev => {
      const next = {
        ...prev,
        ...remote,
      };
      saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    if (initializing) return;
    if (!user) return;
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await refreshFromRemote();
    })();

    return () => {
      cancelled = true;
    };
  }, [initializing, user?.id]);

  // Real-time subscription for tasks
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    if (initializing) return;
    if (!user) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('[Supabase] Task change detected:', payload.eventType);
          // Refresh tasks when changes occur
          void refreshFromRemote();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initializing, user?.id, refreshFromRemote]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    if (initializing) return;
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Supabase] Notification change detected:', payload.eventType);
          // Refresh notifications when changes occur
          void refreshFromRemote();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initializing, user?.id, refreshFromRemote]);

  // Polling fallback: refresh every 30 seconds
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    if (initializing) return;
    if (!user) return;

    const interval = setInterval(() => {
      void refreshFromRemote();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [initializing, user?.id, refreshFromRemote]);

  // Check for unseen completed KPIs when user loads or KPIs change
  useEffect(() => {
    if (initializing) return;
    if (!user?.id) return;
    if (showCompletionModal) return; // Don't check if modal is already showing

    const seenCompletions = getSeenCompletions(user.id);
    
    // Find the first completed KPI that the user hasn't seen yet
    const unseenCompletedKpi = state.kpis.find(kpi => {
      const isCompleted = kpi.currentValue >= kpi.target;
      const isInUserDepartment = kpi.departmentCode === user.departmentCode;
      const notSeen = !seenCompletions.has(kpi.id);
      return isCompleted && isInUserDepartment && notSeen;
    });

    if (unseenCompletedKpi) {
      setCompletedKpi(unseenCompletedKpi);
      setShowCompletionModal(true);
    }
  }, [initializing, user?.id, user?.departmentCode, state.kpis, showCompletionModal]);

  // Check and reset KPIs when periods end
  useEffect(() => {
    if (initializing) return;
    
    const checkAndResetKPIs = () => {
      setLocalState(prev => {
        const kpisToReset: KPI[] = [];
        const updatedKpis = prev.kpis.map(kpi => {
          if (hasPeriodEnded(kpi)) {
            kpisToReset.push({
              ...kpi,
              currentValue: 0,
              periodStartDate: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            });
            
            return {
              ...kpi,
              currentValue: 0,
              periodStartDate: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            };
          }
          return kpi;
        });

        if (kpisToReset.length === 0) return prev;

        // Add notifications for all employees in affected departments
        const newNotifications: Notification[] = [];
        const newActivities: ActivityLog[] = [];
        
        kpisToReset.forEach(kpi => {
          const deptUsers = prev.users.filter(u => 
            u.departmentCode === kpi.departmentCode && u.role !== 'admin'
          );
          
          // Get the original value before reset (from the original kpi, not the reset one)
          const originalKpi = prev.kpis.find(k => k.id === kpi.id);
          const oldValue = originalKpi?.currentValue ?? 0;
          const progressPercent = kpi.target > 0 ? (oldValue / kpi.target) * 100 : 0;
          
          // Professional status message based on performance
          let statusMessage = '';
          if (progressPercent >= 100) {
            statusMessage = `Outstanding performance! You exceeded the target by ${Math.round(progressPercent - 100)}%.`;
          } else if (progressPercent >= 80) {
            statusMessage = `Excellent work! You achieved ${Math.round(progressPercent)}% of the target.`;
          } else if (progressPercent >= 50) {
            statusMessage = `Good progress! You achieved ${Math.round(progressPercent)}% of the target. Keep up the momentum!`;
          } else {
            statusMessage = `You achieved ${Math.round(progressPercent)}% of the target. Let's work together to improve this in the next period.`;
          }
          
          // Format timeframe for display
          const timeframeDisplay = kpi.timeframe === 'Annually' ? 'annual' : 
                                   kpi.timeframe === 'Quarterly' ? 'quarterly' :
                                   kpi.timeframe === 'Monthly' ? 'monthly' :
                                   kpi.timeframe === 'Weekly' ? 'weekly' : 'daily';
          
          deptUsers.forEach(deptUser => {
            newNotifications.push({
              id: `notif_${Math.random().toString(36).slice(2, 9)}`,
              userId: deptUser.id,
              type: 'kpi_reset',
              title: `KPI Period Ended: ${kpi.name}`,
              message: `The ${timeframeDisplay} period for "${kpi.name}" has ended. The KPI has been reset to begin a new tracking period. ${statusMessage} Previous period result: ${oldValue} ${kpi.unit} out of ${kpi.target} ${kpi.unit} target.`,
              timestamp: new Date().toISOString(),
              isRead: false,
              relatedKpiId: kpi.id,
            });
          });

          // Log activity
          newActivities.push({
            id: `act_${Math.random().toString(36).slice(2, 9)}`,
            departmentCode: kpi.departmentCode,
            userId: user?.id || 'system',
            type: 'kpi_updated',
            timestamp: new Date().toISOString(),
            description: `KPI "${kpi.name}" ${timeframeDisplay} period ended. Reset to 0. Previous period result: ${oldValue} ${kpi.unit} (${Math.round(progressPercent)}% of target)`,
            relatedKpiId: kpi.id,
          });
        });

        const updated = {
          ...prev,
          kpis: updatedKpis,
          notifications: [...prev.notifications, ...newNotifications],
          activities: [...prev.activities, ...newActivities],
        };
        
        saveState(updated);
        
        // Sync to Supabase if configured
        if (SUPABASE_CONFIGURED) {
          // Sync updated KPIs
          void Promise.all(
            kpisToReset.map(kpi => 
              callAdminKpi('PATCH', `/api/admin/kpis/${kpi.id}`, {
                name: kpi.name,
                description: kpi.description ?? null,
                unit: kpi.unit,
                target: kpi.target,
                currentValue: 0,
                ownerUserId: kpi.ownerUserId ?? null,
                lastUpdated: kpi.lastUpdated,
                timeframe: kpi.timeframe ?? null,
                periodStartDate: kpi.periodStartDate ?? null,
              })
            )
          ).then(() => {
            // Sync new notifications
            if (newNotifications.length > 0) {
              void supabase
                .from('notifications')
                .upsert(newNotifications.map(mapNotificationToRow))
                .then(({ error }) => {
                  if (error) console.warn('[Supabase] Failed to sync KPI reset notifications', error);
                });
            }
          });
        }
        
        return updated;
      });
    };

    // Check immediately and then every hour
    checkAndResetKPIs();
    const interval = setInterval(checkAndResetKPIs, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(interval);
  }, [initializing]);

  const value = useMemo<DataContextValue>(() => ({
    state,
    setState(next) {
      if (typeof next === 'function') {
        setLocalState(prev => {
          const resolved = (next as (p: AppState) => AppState)(prev);
          saveState(resolved);
          if (SUPABASE_CONFIGURED) {
            const syncPromise = Promise.all([
              syncDepartments(prev.departments, resolved.departments),
              syncUsers(prev.users, resolved.users),
              syncKpiHistory(prev.kpiHistory, resolved.kpiHistory),
              syncTasks(prev.tasks, resolved.tasks),
              syncActivities(prev.activities, resolved.activities),
              syncNotifications(prev.notifications, resolved.notifications),
            ])
              .catch(error => {
                console.warn('[Supabase] Failed to sync state diff', error);
              })
              .finally(() => {
                pendingSync.current = null;
              });
            pendingSync.current = syncPromise.then(() => undefined);
          }
          return resolved;
        });
      } else {
        saveState(next);
        if (SUPABASE_CONFIGURED) {
          const syncPromise = Promise.all([
            syncDepartments(state.departments, next.departments),
            syncUsers(state.users, next.users),
            syncKpiHistory(state.kpiHistory, next.kpiHistory),
            syncTasks(state.tasks, next.tasks),
            syncActivities(state.activities, next.activities),
            syncNotifications(state.notifications, next.notifications),
          ])
            .catch(error => {
              console.warn('[Supabase] Failed to sync state diff', error);
            })
            .finally(() => {
              pendingSync.current = null;
            });
          pendingSync.current = syncPromise.then(() => undefined);
        }
        setLocalState(next);
      }
    },
    updateKpi(kpi: KPI) {
      setLocalState(prev => {
        // Check if KPI just reached completion
        const previousKpi = prev.kpis.find(k => k.id === kpi.id);
        const wasCompleted = previousKpi && previousKpi.currentValue >= previousKpi.target;
        const isNowCompleted = kpi.currentValue >= kpi.target;
        
        // Show completion modal if KPI just reached completion (wasn't completed before, but is now)
        // and user hasn't seen it yet
        if (!wasCompleted && isNowCompleted && user?.id) {
          const seenCompletions = getSeenCompletions(user.id);
          if (!seenCompletions.has(kpi.id)) {
            setCompletedKpi(kpi);
            setShowCompletionModal(true);
          }
        }
        
        const updated = { ...prev, kpis: prev.kpis.map(k => k.id === kpi.id ? kpi : k) };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void callAdminKpi('PATCH', `/api/admin/kpis/${kpi.id}`, {
            name: kpi.name,
            description: kpi.description ?? null,
            unit: kpi.unit,
            target: kpi.target,
            currentValue: kpi.currentValue,
            ownerUserId: kpi.ownerUserId ?? null,
            lastUpdated: kpi.lastUpdated,
            timeframe: kpi.timeframe ?? null,
            periodStartDate: kpi.periodStartDate ?? null,
          }).then(() => refreshFromRemote());
        }
        return updated;
      });
    },
    addKpi(kpi: KPI) {
      setLocalState(prev => {
        const updated = { ...prev, kpis: [...prev.kpis, kpi] };
        saveState(updated);
        console.log('[DataContext] addKpi -> local state updated', { id: kpi.id, department: kpi.departmentCode });
        if (SUPABASE_CONFIGURED) {
          console.log('[DataContext] addKpi -> syncing with admin API');
          void callAdminKpi('POST', '/api/admin/kpis', {
            id: kpi.id,
            departmentCode: kpi.departmentCode,
            name: kpi.name,
            description: kpi.description ?? null,
            unit: kpi.unit,
            target: kpi.target,
            currentValue: kpi.currentValue,
            ownerUserId: kpi.ownerUserId ?? null,
            lastUpdated: kpi.lastUpdated,
            timeframe: kpi.timeframe ?? null,
            periodStartDate: kpi.periodStartDate ?? null,
          }).then(() => {
            console.log('[DataContext] addKpi -> refreshFromRemote');
            return refreshFromRemote();
          });
        }
        return updated;
      });
    },
    deleteKpi(id: string) {
      setLocalState(prev => {
        const updated = { ...prev, kpis: prev.kpis.filter(k => k.id !== id) };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void callAdminKpi('DELETE', `/api/admin/kpis/${id}`).then(() => refreshFromRemote());
        }
        return updated;
      });
    },
    upsertTask(task: Task) {
      setLocalState(prev => {
        const exists = prev.tasks.some(t => t.id === task.id);
        const nextTasks = exists ? prev.tasks.map(t => t.id === task.id ? task : t) : [task, ...prev.tasks];
        const updated = { ...prev, tasks: nextTasks };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase.from('tasks').upsert(mapTaskToRow(task)).then(({ error }) => {
            if (error) console.warn('[Supabase] Failed to upsert task', error);
          });
        }
        return updated;
      });
    },
    deleteTask(id: string) {
      setLocalState(prev => {
        const updated = { ...prev, tasks: prev.tasks.filter(t => t.id !== id) };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
            if (error) console.warn('[Supabase] Failed to delete task', error);
          });
        }
        return updated;
      });
    },
    setPreviewDepartment(code: string) {
      setLocalState(prev => {
        const updated = { ...prev, previewDepartmentCode: code };
        saveState(updated);
        return updated;
      });
    },
    addActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>) {
      setLocalState(prev => {
        const newActivity: ActivityLog = {
          ...activity,
          id: `act_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        const updated = { ...prev, activities: [newActivity, ...prev.activities].slice(0, 100) }; // Keep last 100
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase.from('activities').upsert(mapActivityToRow(newActivity)).then(({ error }) => {
            if (error) console.warn('[Supabase] Failed to add activity', error);
          });
        }
        return updated;
      });
    },
    addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
      let created: Notification | null = null;
      setLocalState(prev => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        created = newNotification;
        const updated = { ...prev, notifications: [newNotification, ...prev.notifications] };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase.from('notifications').upsert(mapNotificationToRow(newNotification)).then(({ error }) => {
            if (error) console.warn('[Supabase] Failed to add notification', error);
          });
        }
        return updated;
      });
      return created!;
    },
    markNotificationAsRead(notificationId: string) {
      setLocalState(prev => {
        const updated = { 
          ...prev, 
          notifications: prev.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ) 
        };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .then(({ error }) => {
              if (error) console.warn('[Supabase] Failed to mark notification as read', error);
            });
        }
        return updated;
      });
    },
    markAllNotificationsAsRead(userId: string) {
      setLocalState(prev => {
        const updated = { 
          ...prev, 
          notifications: prev.notifications.map(n => 
            n.userId === userId ? { ...n, isRead: true } : n
          ) 
        };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.warn('[Supabase] Failed to mark notifications as read', error);
            });
        }
        return updated;
      });
    },
    removeNotification(notificationId: string) {
      setLocalState(prev => {
        const updated = {
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== notificationId),
        };
        saveState(updated);
        if (SUPABASE_CONFIGURED) {
          void supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .then(({ error }) => {
              if (error) console.warn('[Supabase] Failed to remove notification', error);
            });
        }
        return updated;
      });
    },
    async refreshDirectory() {
      if (pendingSync.current) {
        try {
          await pendingSync.current;
        } catch (err) {
          console.warn('[Supabase] Pending sync failed before refresh', err);
        }
      }
      await refreshFromRemote();
    }
  }), [state]);

  return (
    <DataContext.Provider value={value}>
      {children}
      <KpiCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          // Mark this completion as seen when user closes the modal
          if (completedKpi && user?.id) {
            markCompletionAsSeen(user.id, completedKpi.id);
          }
          setShowCompletionModal(false);
          setCompletedKpi(null);
        }}
        kpi={completedKpi}
      />
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}


