export type Role = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  departmentCode?: string;
  status: 'active' | 'disabled';
  canCreateTasks?: boolean;
  requirePasswordChange?: boolean;
  password?: string; // For demo purposes, stored in state
  specialty?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  managerUserId?: string;
  status: 'active' | 'archived';
}

export interface KPIHistoryEntry {
  id: string;
  kpiId: string;
  timestamp: string; // ISO
  userId: string;
  field: 'name' | 'unit' | 'target' | 'currentValue' | 'ownerUserId';
  oldValue: string;
  newValue: string;
}

export interface KPI {
  id: string;
  departmentCode: string;
  name: string;
  description?: string;
  unit: string;
  target: number;
  currentValue: number;
  ownerUserId?: string;
  lastUpdated: string; // ISO date
}

export type TaskStatus = 'backlog' | 'in_progress' | 'pending_approval' | 'completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskComment {
  id: string;
  userId: string;
  timestamp: string;
  text: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  url: string; // for demo only
}

export interface Task {
  id: string;
  departmentCode: string;
  title: string;
  description?: string;
  assigneeUserIds: string[];
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  relatedKpiId?: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  progressPercent?: number; // member-updated
}

export type ActivityType = 'task_completed' | 'task_created' | 'task_comment' | 'kpi_updated' | 'task_status_changed';

export interface ActivityLog {
  id: string;
  departmentCode: string;
  userId: string;
  type: ActivityType;
  timestamp: string; // ISO
  description: string;
  relatedTaskId?: string;
  relatedKpiId?: string;
}

export type NotificationType = 'task_assigned' | 'task_due_soon' | 'task_overdue' | 'task_approved' | 'task_rejected';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO
  isRead: boolean;
  relatedTaskId?: string;
  relatedKpiId?: string;
}

export interface AppState {
  users: User[];
  departments: Department[];
  kpis: KPI[];
  kpiHistory: KPIHistoryEntry[];
  tasks: Task[];
  activities: ActivityLog[];
  notifications: Notification[];
  previewDepartmentCode?: string; // admin can switch
}


