import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Calendar, AlertCircle, Edit3 } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../types.ts';
import { formatISO } from 'date-fns';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  task: Task | null;
  users: Array<{ id: string; displayName: string }>;
  kpis: Array<{ id: string; name: string }>;
}

export function EditTaskModal({ isOpen, onClose, onUpdate, task, users, kpis }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [relatedKpiId, setRelatedKpiId] = useState<string>('');

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeUserIds(task.assigneeUserIds);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setPriority(task.priority);
      setStatus(task.status);
      setRelatedKpiId(task.relatedKpiId || '');
    }
  }, [task]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !task) return;
    
    const updatedTask: Task = {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeUserIds,
      dueDate: dueDate ? formatISO(new Date(dueDate)) : undefined,
      priority,
      status,
      relatedKpiId: relatedKpiId || undefined,
    };
    
    onUpdate(updatedTask);
    onClose();
  }

  function toggleAssignee(userId: string) {
    setAssigneeUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-brand rounded-lg">
                    <Edit3 size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Task</h2>
                    <p className="text-sm text-gray-600">Update task details and assignments</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors resize-none"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                  />
                </div>
              </div>

              {/* Related KPI */}
              <div>
                <label className="block text-sm font-medium mb-2">Related KPI (optional)</label>
                <select
                  value={relatedKpiId}
                  onChange={(e) => setRelatedKpiId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                >
                  <option value="">None</option>
                  {kpis.map(kpi => (
                    <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                  ))}
                </select>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium mb-3">Assignees</label>
                <div className="grid grid-cols-2 gap-2">
                  {users.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-orange-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={assigneeUserIds.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                        className="rounded border-gray-300 text-brand-1 focus:ring-brand-1"
                      />
                      <span className="text-sm">{user.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-brand text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckSquare size={18} />
                  Update Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
