import { useMemo, useState } from 'react';
import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useNotifications } from '../context/NotificationContext.tsx';
import type { Task, TaskPriority, TaskStatus } from '../types.ts';
import { NewTaskModal } from '../components/modals/NewTaskModal.tsx';
import { EditTaskModal } from '../components/modals/EditTaskModal.tsx';
import { CompleteTaskModal } from '../components/modals/CompleteTaskModal.tsx';
import { TaskAttachments } from '../components/tasks/TaskAttachments.tsx';
import { motion } from 'framer-motion';
import { ListChecks, LayoutGrid, Filter, Plus, CheckCircle, CheckCircle2, Clock, AlertCircle, XCircle, Calendar, Target, Edit3, Trash2 } from 'lucide-react';

const STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'pending_approval', 'completed'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

function priorityColor(p: TaskPriority) {
  if (p === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-orange-100 text-brand-1 border-orange-200';
}

function statusIcon(s: TaskStatus) {
  if (s === 'completed') return <CheckCircle size={16} className="text-green-600" />;
  if (s === 'in_progress') return <Clock size={16} className="text-brand-1" />;
  if (s === 'pending_approval') return <AlertCircle size={16} className="text-amber-600" />;
  return <XCircle size={16} className="text-gray-400" />;
}

export function TasksPage() {
  const { user } = useAuth();
  const { state, upsertTask, deleteTask, addActivity, updateKpi } = useData();
  const { showNotification } = useNotifications();
  const isManager = hasRole(user, ['manager']);
  const canCreate = isManager || !!user?.canCreateTasks;

  const scopeDept = user?.role === 'admin' ? state.previewDepartmentCode : user?.departmentCode;
  const tasks = useMemo(() => state.tasks.filter(t => t.departmentCode === scopeDept), [state.tasks, scopeDept]);
  const deptUsers = state.users.filter(u => u.departmentCode === scopeDept && u.role !== 'admin');
  const deptKpis = state.kpis.filter(k => k.departmentCode === scopeDept);

  const [tab, setTab] = useState<'table' | 'kanban'>('kanban');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filtered = tasks.filter(t => (filterStatus === 'all' || t.status === filterStatus) && (filterPriority === 'all' || t.priority === filterPriority));

  function handleAddTask(taskData: Omit<Task, 'id' | 'comments' | 'attachments'>) {
    const newTask: Task = {
      ...taskData,
      id: `t_${Math.random().toString(36).slice(2, 9)}`,
      comments: [],
      attachments: [],
    };
    upsertTask(newTask);
    
    // Log activity
    addActivity({
      departmentCode: newTask.departmentCode,
      userId: user?.id || '',
      type: 'task_created',
      description: `Created task: "${newTask.title}"`,
      relatedTaskId: newTask.id,
    });

    // Send notifications to assignees
    taskData.assigneeUserIds.forEach(assigneeId => {
      const assignee = state.users.find(u => u.id === assigneeId);
      if (assignee) {
        showNotification(
          'task_assigned',
          'New Task Assigned',
          `You have been assigned a new task: "${newTask.title}"${newTask.dueDate ? ` (Due: ${new Date(newTask.dueDate).toLocaleDateString()})` : ''}`,
          newTask.id,
          assigneeId
        );
      }
    });
  }

  function updateStatus(task: Task, status: TaskStatus) {
    const oldStatus = task.status;
    upsertTask({ ...task, status });
    
    // Log activity
    if (oldStatus !== status) {
      addActivity({
        departmentCode: task.departmentCode,
        userId: user?.id || '',
        type: 'task_status_changed',
        description: `Changed "${task.title}" status from ${oldStatus.replace('_', ' ')} to ${status.replace('_', ' ')}`,
        relatedTaskId: task.id,
      });
    }
  }

  function markDone(task: Task) {
    setSelectedTask(task);
    setIsCompleteModalOpen(true);
  }

  async function handleCompleteTask(taskId: string, files: File[], message?: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Convert files to base64 for demo storage
    const attachments = await Promise.all(
      files.map(async (file) => {
        return new Promise<{ id: string; fileName: string; url: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              id: `att_${Math.random().toString(36).slice(2, 9)}`,
              fileName: file.name,
              url: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    // Add comment if message provided
    const newComments = message ? [
      ...task.comments,
      {
        id: `c_${Math.random().toString(36).slice(2, 9)}`,
        userId: user?.id || '',
        timestamp: new Date().toISOString(),
        text: message,
      }
    ] : task.comments;

    // Update task with attachments and status
    upsertTask({
      ...task,
      status: 'pending_approval',
      attachments: [...task.attachments, ...attachments],
      comments: newComments,
    });
    
    // Log activity
    addActivity({
      departmentCode: task.departmentCode,
      userId: user?.id || '',
      type: 'task_completed',
      description: `Completed task: "${task.title}" and submitted for approval`,
      relatedTaskId: task.id,
    });
  }

  function approve(task: Task) {
    updateStatus(task, 'completed');
    
    // Auto-increment related KPI if exists
    if (task.relatedKpiId) {
      const relatedKpi = state.kpis.find(k => k.id === task.relatedKpiId);
      if (relatedKpi) {
        updateKpi({
          ...relatedKpi,
          currentValue: relatedKpi.currentValue + 1,
        });
        
        // Log KPI update activity
        addActivity({
          departmentCode: task.departmentCode,
          userId: user?.id || '',
          type: 'kpi_updated',
          description: `KPI "${relatedKpi.name}" increased to ${relatedKpi.currentValue + 1} after task completion`,
          relatedKpiId: relatedKpi.id,
          relatedTaskId: task.id,
        });
      }
    }
    
    // Log activity
    addActivity({
      departmentCode: task.departmentCode,
      userId: user?.id || '',
      type: 'task_status_changed',
      description: `Approved task: "${task.title}"`,
      relatedTaskId: task.id,
    });

    // Send notification to task assignees
    task.assigneeUserIds.forEach(assigneeId => {
      const assignee = state.users.find(u => u.id === assigneeId);
      if (assignee) {
        showNotification(
          'task_approved',
          'Task Approved',
          `Your task "${task.title}" has been approved and marked as completed!`,
          task.id,
          assigneeId
        );
      }
    });
  }

  function reject(task: Task) {
    updateStatus(task, 'in_progress');
    
    // Log activity
    addActivity({
      departmentCode: task.departmentCode,
      userId: user?.id || '',
      type: 'task_status_changed',
      description: `Rejected task: "${task.title}" - returned for revision`,
      relatedTaskId: task.id,
    });

    // Send notification to task assignees
    task.assigneeUserIds.forEach(assigneeId => {
      const assignee = state.users.find(u => u.id === assigneeId);
      if (assignee) {
        showNotification(
          'task_rejected',
          'Task Needs Revision',
          `Your task "${task.title}" has been returned for revision. Please review and resubmit.`,
          task.id,
          assigneeId
        );
      }
    });
  }

  function handleEditTask(task: Task) {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  }

  function handleUpdateTask(updatedTask: Task) {
    upsertTask(updatedTask);
    
    // Log activity
    addActivity({
      departmentCode: updatedTask.departmentCode,
      userId: user?.id || '',
      type: 'task_status_changed',
      description: `Updated task: "${updatedTask.title}"`,
      relatedTaskId: updatedTask.id,
    });

    // Send notification to task assignees about the update
    updatedTask.assigneeUserIds.forEach(assigneeId => {
      const assignee = state.users.find(u => u.id === assigneeId);
      if (assignee) {
        showNotification(
          'task_assigned',
          'Task Updated',
          `Task "${updatedTask.title}" has been updated. Please review the changes.`,
          updatedTask.id,
          assigneeId
        );
      }
    });
  }

  function handleDeleteTask(task: Task) {
    if (window.confirm(`Are you sure you want to delete the task "${task.title}"? This action cannot be undone.`)) {
      deleteTask(task.id);
      
      // Log activity
      addActivity({
        departmentCode: task.departmentCode,
        userId: user?.id || '',
        type: 'task_status_changed',
        description: `Deleted task: "${task.title}"`,
        relatedTaskId: task.id,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-brand bg-clip-text text-transparent mb-2">
            Task Management
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <ListChecks size={18} className="text-brand-1" />
            Organize and complete your team's objectives
          </p>
        </div>
        {canCreate && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-3 bg-gradient-brand text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} />
            New Task
          </motion.button>
        )}
      </div>

      <div className="card card-padding bg-white border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('kanban')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all ${
                tab === 'kanban' 
                  ? 'bg-gradient-brand text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LayoutGrid size={16} />
              Kanban
            </button>
            <button
              onClick={() => setTab('table')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all ${
                tab === 'table' 
                  ? 'bg-gradient-brand text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ListChecks size={16} />
              Table
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
              <Filter size={16} className="text-brand-1" />
              <span className="text-xs font-semibold text-gray-600">Filters:</span>
            </div>
            <select
              className="rounded-lg border-gray-300 text-sm focus:border-brand-1 focus:ring-brand-1 shadow-sm bg-white"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select
              className="rounded-lg border-gray-300 text-sm focus:border-brand-1 focus:ring-brand-1 shadow-sm bg-white"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as any)}
            >
              <option value="all">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <span className="text-xs font-bold text-brand-1">
                {filtered.length} task{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {tab === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATUSES.map((col, colIdx) => {
            const columnTasks = filtered.filter(t => t.status === col);
            return (
              <motion.div
                key={col}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.1 }}
                className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(col)}
                      <span className="font-bold capitalize text-sm text-gray-800">{col.replace('_', ' ')}</span>
                    </div>
                    <div className="px-2.5 py-1 bg-gradient-brand rounded-full">
                      <span className="text-xs font-bold text-white">{columnTasks.length}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-3 min-h-[450px] bg-gradient-to-b from-gray-50/30 to-white">
                  {columnTasks.map((t, idx) => {
                    const assignees = state.users.filter(u => t.assigneeUserIds.includes(u.id));
                    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';
                    const relatedKpi = t.relatedKpiId ? state.kpis.find(k => k.id === t.relatedKpiId) : null;
                    const isMyTask = user?.id ? t.assigneeUserIds.includes(user.id) : false;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -4, boxShadow: '0 12px 24px -4px rgb(0 0 0 / 0.08)' }}
                        className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all border-2 ${
                          isMyTask
                            ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400 hover:border-orange-500 ring-2 ring-orange-200'
                            : isOverdue 
                              ? 'bg-red-50/20 border-red-200' 
                              : 'bg-white border-gray-200 hover:border-orange-200'
                        }`}
                      >
                        {/* Header with title and priority */}
                        <div className="mb-3">
                          {isMyTask && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-brand-1 text-white text-xs font-bold rounded-md mb-2 shadow-sm"
                            >
                              <span>⭐</span>
                              <span>Your Task</span>
                            </motion.div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-gray-900 flex-1 leading-snug line-clamp-2">{t.title}</h4>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${priorityColor(t.priority)} whitespace-nowrap flex-shrink-0`}>
                              {t.priority}
                            </span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        {t.description && (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">{t.description}</p>
                        )}
                        
                        {/* Related KPI Badge */}
                        {relatedKpi && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-3 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Target size={12} className="text-brand-1" />
                              <span className="text-xs font-bold text-brand-1">Target KPI</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-800">{relatedKpi.name}</span>
                              <span className="text-xs font-bold text-brand-1">
                                {relatedKpi.currentValue}/{relatedKpi.target} {relatedKpi.unit}
                              </span>
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Due Date */}
                        <div className="flex items-center justify-between text-xs mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-brand-1" />
                            <span className="font-medium text-gray-700">
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                            </span>
                          </div>
                          {isOverdue && (
                            <span className="text-red-600 font-bold px-2 py-0.5 bg-red-100 rounded-md text-xs">
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        {/* Attachments */}
                        {t.attachments.length > 0 && (
                          <div className="mb-3">
                            <TaskAttachments attachments={t.attachments} />
                          </div>
                        )}
                        
                        {/* Assignees */}
                        <div className="mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-gray-600">Assigned to:</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {assignees.map(a => (
                              <div
                                key={a.id}
                                className="group relative"
                              >
                                <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                                  {a.displayName.charAt(0)}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                  {a.displayName}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="space-y-2">
                          {col !== 'completed' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                              onClick={() => markDone(t)}
                            >
                              <CheckCircle2 size={15} />
                              Mark Complete
                            </motion.button>
                          )}
                          {isManager && col === 'pending_approval' && (
                            <div className="grid grid-cols-2 gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-sm"
                                onClick={() => approve(t)}
                              >
                                ✓ Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 transition-all font-semibold shadow-sm"
                                onClick={() => reject(t)}
                              >
                                ✗ Return
                              </motion.button>
                            </div>
                          )}
                          {isManager && (
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-sm flex items-center justify-center gap-1"
                                onClick={() => handleEditTask(t)}
                              >
                                <Edit3 size={14} />
                                Edit
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-sm flex items-center justify-center gap-1"
                                onClick={() => handleDeleteTask(t)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No tasks
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-700 bg-gradient-to-r from-gray-50 to-white">
              <tr className="border-b border-gray-200">
                <th className="px-5 py-4 font-semibold">Task</th>
                <th className="px-5 py-4 font-semibold">Assignees</th>
                <th className="px-5 py-4 font-semibold">Due Date</th>
                <th className="px-5 py-4 font-semibold">Priority</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                const assignees = state.users.filter(u => t.assigneeUserIds.includes(u.id));
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';
                const relatedKpi = t.relatedKpiId ? state.kpis.find(k => k.id === t.relatedKpiId) : null;
                const isMyTask = user?.id ? t.assigneeUserIds.includes(user.id) : false;
                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-b border-gray-100 transition-colors ${
                      isMyTask
                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-l-4 border-l-brand-1'
                        : isOverdue 
                          ? 'bg-red-50/20 hover:bg-red-50/40' 
                          : 'hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-amber-50/30'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {isMyTask && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-1 text-white text-xs font-bold rounded-md shadow-sm">
                            ⭐
                          </span>
                        )}
                        <div className="font-semibold text-gray-900">{t.title}</div>
                      </div>
                      {t.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</div>
                      )}
                      {t.attachments.length > 0 && (
                        <div className="text-xs text-brand-1 mt-1 flex items-center gap-1">
                          <span>📎</span>
                          {t.attachments.length} file{t.attachments.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      {relatedKpi && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-md">
                          <Target size={11} className="text-brand-1" />
                          <span className="text-xs font-semibold text-brand-1">{relatedKpi.name}</span>
                          <span className="text-xs font-bold text-brand-1">
                            ({relatedKpi.currentValue}/{relatedKpi.target})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex -space-x-1">
                        {assignees.map(a => (
                          <div
                            key={a.id}
                            className="group relative"
                          >
                            <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold border-2 border-white shadow cursor-pointer hover:scale-110 hover:z-10 transition-transform">
                              {a.displayName.charAt(0)}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                              {a.displayName}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </div>
                      {isOverdue && <div className="text-xs text-red-600 font-semibold mt-0.5">Overdue</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {statusIcon(t.status)}
                        <span className="text-sm capitalize font-medium text-gray-700">{t.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {t.status !== 'completed' && (
                          <button
                            className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 transition-all font-semibold border border-green-200"
                            onClick={() => markDone(t)}
                          >
                            Mark Done
                          </button>
                        )}
                        {isManager && t.status === 'pending_approval' && (
                          <>
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 transition-all font-semibold border border-green-200"
                              onClick={() => approve(t)}
                            >
                              Approve
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-200 hover:to-rose-200 transition-all font-semibold border border-red-200"
                              onClick={() => reject(t)}
                            >
                              Return
                            </button>
                          </>
                        )}
                        {isManager && (
                          <>
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300 transition-all font-semibold border border-blue-200 flex items-center gap-1"
                              onClick={() => handleEditTask(t)}
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300 transition-all font-semibold border border-red-200 flex items-center gap-1"
                              onClick={() => handleDeleteTask(t)}
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ListChecks size={40} className="text-gray-300" />
                      <p className="text-gray-400 font-medium">No tasks found</p>
                      <p className="text-gray-400 text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTask}
        departmentCode={scopeDept || ''}
        users={deptUsers}
        kpis={deptKpis}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
        task={selectedTask}
        users={deptUsers}
        kpis={deptKpis}
      />

      <CompleteTaskModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
        task={selectedTask}
      />
    </div>
  );
}

