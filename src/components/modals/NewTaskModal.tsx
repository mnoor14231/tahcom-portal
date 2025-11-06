import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import type { Task, TaskPriority } from '../../types.ts';
import { formatISO, addDays } from 'date-fns';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'comments' | 'attachments'>) => void;
  departmentCode: string;
  users: Array<{ id: string; displayName: string }>;
  kpis: Array<{ id: string; name: string }>;
}

export function NewTaskModal({ isOpen, onClose, onAdd, departmentCode, users, kpis }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(formatISO(addDays(new Date(), 7)).split('T')[0]);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [relatedKpiId, setRelatedKpiId] = useState<string>('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd({
      departmentCode,
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeUserIds,
      dueDate: dueDate ? formatISO(new Date(dueDate)) : undefined,
      priority,
      status: 'backlog',
      relatedKpiId: relatedKpiId || undefined,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setAssigneeUserIds([]);
    setDueDate(formatISO(addDays(new Date(), 7)).split('T')[0]);
    setPriority('Medium');
    setRelatedKpiId('');
    onClose();
  }

  function toggleAssignee(userId: string) {
    setAssigneeUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl shadow-2xl my-8"
            >
              <div className="card-padding">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-orange-100 rounded-xl">
                      <CheckSquare className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Create New Task</h3>
                      <p className="text-sm text-gray-600">{departmentCode} Department</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <CheckSquare size={16} />
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                      placeholder="Task details (optional)"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Calendar size={16} />
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <AlertCircle size={16} />
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Related KPI (optional)</label>
                    <select
                      value={relatedKpiId}
                      onChange={(e) => setRelatedKpiId(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                    >
                      <option value="">None</option>
                      {kpis.map(kpi => (
                        <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Assignees</label>
                    <div className="grid grid-cols-2 gap-2">
                      {users.map(user => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={assigneeUserIds.includes(user.id)}
                            onChange={() => toggleAssignee(user.id)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm">{user.displayName}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 btn btn-outline py-2.5"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 btn btn-primary py-2.5 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <CheckSquare size={18} />
                      Create Task
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

