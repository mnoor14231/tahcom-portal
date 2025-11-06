import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AppState, KPI, Task, ActivityLog, Notification } from '../types.ts';
import { loadState, saveState } from '../data/seed.ts';

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
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  const value = useMemo<DataContextValue>(() => ({
    state,
    setState(next) {
      if (typeof next === 'function') {
        setState(prev => {
          const resolved = (next as (p: AppState) => AppState)(prev);
          saveState(resolved);
          return resolved;
        });
      } else {
        saveState(next);
        setState(next);
      }
    },
    updateKpi(kpi: KPI) {
      setState(prev => {
        const updated = { ...prev, kpis: prev.kpis.map(k => k.id === kpi.id ? kpi : k) };
        saveState(updated);
        return updated;
      });
    },
    addKpi(kpi: KPI) {
      setState(prev => {
        const updated = { ...prev, kpis: [...prev.kpis, kpi] };
        saveState(updated);
        return updated;
      });
    },
    deleteKpi(id: string) {
      setState(prev => {
        const updated = { ...prev, kpis: prev.kpis.filter(k => k.id !== id) };
        saveState(updated);
        return updated;
      });
    },
    upsertTask(task: Task) {
      setState(prev => {
        const exists = prev.tasks.some(t => t.id === task.id);
        const nextTasks = exists ? prev.tasks.map(t => t.id === task.id ? task : t) : [task, ...prev.tasks];
        const updated = { ...prev, tasks: nextTasks };
        saveState(updated);
        return updated;
      });
    },
    deleteTask(id: string) {
      setState(prev => {
        const updated = { ...prev, tasks: prev.tasks.filter(t => t.id !== id) };
        saveState(updated);
        return updated;
      });
    },
    setPreviewDepartment(code: string) {
      setState(prev => {
        const updated = { ...prev, previewDepartmentCode: code };
        saveState(updated);
        return updated;
      });
    },
    addActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>) {
      setState(prev => {
        const newActivity: ActivityLog = {
          ...activity,
          id: `act_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        const updated = { ...prev, activities: [newActivity, ...prev.activities].slice(0, 100) }; // Keep last 100
        saveState(updated);
        return updated;
      });
    },
    addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
      setState(prev => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        const updated = { ...prev, notifications: [newNotification, ...prev.notifications] };
        saveState(updated);
        return updated;
      });
    },
    markNotificationAsRead(notificationId: string) {
      setState(prev => {
        const updated = { 
          ...prev, 
          notifications: prev.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ) 
        };
        saveState(updated);
        return updated;
      });
    },
    markAllNotificationsAsRead(userId: string) {
      setState(prev => {
        const updated = { 
          ...prev, 
          notifications: prev.notifications.map(n => 
            n.userId === userId ? { ...n, isRead: true } : n
          ) 
        };
        saveState(updated);
        return updated;
      });
    }
  }), [state]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}


