import { addDays, formatISO } from 'date-fns';
import type { AppState, Department, KPI, KPIHistoryEntry, Task, User } from '../types.ts';

export const STORAGE_KEY = 'tahcom-kpi-state-v1';

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function computeProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((current / target) * 100);
}

export function seedInitialState(): AppState {
  const today = new Date();

  const admin: User = {
    id: 'u_admin', username: 'admin', displayName: 'Admin', role: 'admin', status: 'active', requirePasswordChange: true,
  };
  const bdManager: User = {
    id: 'u_bd_manager', username: 'BDmanager', displayName: 'BD Manager', role: 'manager', status: 'active', departmentCode: 'BD', requirePasswordChange: true
  };
  const bdMember1: User = {
    id: 'u_bd_m1', username: 'BDmember1', displayName: 'BD Member 1', role: 'member', status: 'active', departmentCode: 'BD', canCreateTasks: true, specialty: 'Sales', requirePasswordChange: true
  } as any;
  const bdMember2: User = {
    id: 'u_bd_m2', username: 'BDmember2', displayName: 'BD Member 2', role: 'member', status: 'active', departmentCode: 'BD', canCreateTasks: false, specialty: 'Marketing', requirePasswordChange: true
  } as any;

  const bdDept: Department = {
    id: 'd_bd', code: 'BD', name: 'Business Development', managerUserId: bdManager.id, status: 'active'
  };
  const bsDept: Department = { id: 'd_bs', code: 'BS', name: 'Business Solutions', status: 'active' };
  const cyDept: Department = { id: 'd_cy', code: 'CY', name: 'Cybersecurity', status: 'active' };
  const psDept: Department = { id: 'd_ps', code: 'PS', name: 'Partnerships', status: 'active' };
  const hrDept: Department = { id: 'd_hr', code: 'HR', name: 'Human Resources', status: 'active' };
  const pmDept: Department = { id: 'd_pm', code: 'PM', name: 'Project Management', status: 'active' };

  const kpi1: KPI = {
    id: 'k_leads', departmentCode: 'BD', name: 'Leads Generated (Q1)', unit: 'count', target: 50, currentValue: 32, ownerUserId: bdManager.id, lastUpdated: formatISO(today)
  };
  const kpi2: KPI = {
    id: 'k_qualified', departmentCode: 'BD', name: 'Qualified Opportunities', unit: 'count', target: 12, currentValue: 9, ownerUserId: bdManager.id, lastUpdated: formatISO(today)
  };
  const kpi3: KPI = {
    id: 'k_closed', departmentCode: 'BD', name: 'Closed Deals', unit: 'count', target: 5, currentValue: 3, ownerUserId: bdManager.id, lastUpdated: formatISO(today)
  };

  const history: KPIHistoryEntry[] = [
    { id: id('h'), kpiId: kpi1.id, timestamp: formatISO(today), userId: bdManager.id, field: 'currentValue', oldValue: '30', newValue: '32' },
    { id: id('h'), kpiId: kpi2.id, timestamp: formatISO(today), userId: bdManager.id, field: 'currentValue', oldValue: '8', newValue: '9' },
    { id: id('h'), kpiId: kpi3.id, timestamp: formatISO(today), userId: bdManager.id, field: 'currentValue', oldValue: '2', newValue: '3' },
  ];

  const t1: Task = {
    id: 't_pitch', departmentCode: 'BD', title: 'Prepare enterprise pitch', description: 'Draft tailored enterprise deck', assigneeUserIds: [bdMember1.id], dueDate: formatISO(addDays(today, 7)), priority: 'High', status: 'in_progress', comments: [
      { id: id('c'), userId: bdMember1.id, timestamp: formatISO(today), text: 'Drafted first outline.' },
    ], attachments: [], progressPercent: 30
  };
  const t2: Task = {
    id: 't_prospect', departmentCode: 'BD', title: 'Prospect list refinement', assigneeUserIds: [bdMember2.id], dueDate: formatISO(addDays(today, 5)), priority: 'Medium', status: 'backlog', comments: [
      { id: id('c'), userId: bdMember2.id, timestamp: formatISO(today), text: 'Gathered sources to start.' },
    ], attachments: []
  };
  const t3: Task = {
    id: 't_pipeline', departmentCode: 'BD', title: 'Weekly pipeline review', assigneeUserIds: [bdMember1.id, bdMember2.id], dueDate: formatISO(addDays(today, 3)), priority: 'Low', status: 'backlog', comments: [], attachments: []
  };

  // Minimal KPIs for other departments (demo)
  const deptStubKpis: KPI[] = [
    { id: 'k_bs_uptime', departmentCode: 'BS', name: 'Solution Uptime', unit: '%', target: 99, currentValue: 97, lastUpdated: formatISO(today) },
    { id: 'k_cy_incidents', departmentCode: 'CY', name: 'Incidents Resolved', unit: 'count', target: 20, currentValue: 15, lastUpdated: formatISO(today) },
    { id: 'k_ps_partners', departmentCode: 'PS', name: 'New Partners', unit: 'count', target: 10, currentValue: 6, lastUpdated: formatISO(today) },
    { id: 'k_hr_hires', departmentCode: 'HR', name: 'Monthly Hires', unit: 'count', target: 8, currentValue: 5, lastUpdated: formatISO(today) },
    { id: 'k_pm_onTime', departmentCode: 'PM', name: 'On-time Milestones', unit: '%', target: 90, currentValue: 76, lastUpdated: formatISO(today) },
  ] as KPI[];

  return {
    users: [admin, bdManager, bdMember1, bdMember2],
    departments: [bdDept, bsDept, cyDept, psDept, hrDept, pmDept],
    kpis: [kpi1, kpi2, kpi3, ...deptStubKpis],
    kpiHistory: history,
    tasks: [t1, t2, t3],
    activities: [],
    notifications: [],
    previewDepartmentCode: 'BD',
  } satisfies AppState;
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { 
      const parsed = JSON.parse(raw) as AppState;
      // Ensure activities array exists for backwards compatibility
      if (!parsed.activities) {
        parsed.activities = [];
      }
      // Ensure notifications array exists for backwards compatibility
      if (!parsed.notifications) {
        parsed.notifications = [];
      }
      // Ensure all users have requirePasswordChange flag set to true for security
      const updatedUsers = parsed.users.map(user => ({
        ...user,
        requirePasswordChange: user.requirePasswordChange !== false // Set to true if not explicitly false
      }));
      
      // Only update if there were changes
      if (JSON.stringify(updatedUsers) !== JSON.stringify(parsed.users)) {
        const updatedState = { ...parsed, users: updatedUsers };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
        return updatedState;
      }
      
      return parsed;
    } catch {}
  }
  const seeded = seedInitialState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


