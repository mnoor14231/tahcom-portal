import { useState } from 'react';
import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { AddMemberModal } from '../components/modals/AddMemberModal.tsx';
import { EditMemberModal } from '../components/modals/EditMemberModal.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { User } from '../types.ts';

export function PeoplePage() {
  const { user } = useAuth();
  const { state, setState } = useData();
  const isManager = hasRole(user, ['manager']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!isManager) return <div className="text-sm text-gray-600">Department Managers only.</div>;

  const members = state.users.filter(u => u.departmentCode === user?.departmentCode && u.role === 'member');

  function toggleCreate(id: string) {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, canCreateTasks: !u.canCreateTasks } : u)
    }));
  }

  function handleAddMember(data: { displayName: string; username: string; specialty: string }) {
    const newUser = {
      id: `u_${Math.random().toString(36).slice(2, 9)}`,
      username: data.username,
      displayName: data.displayName,
      role: 'member' as const,
      departmentCode: user?.departmentCode,
      status: 'active' as const,
      canCreateTasks: true, // Default to true
      requirePasswordChange: true, // Require password change on first login
      specialty: data.specialty,
    };
    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
  }

  function handleEditMember(data: { id: string; displayName: string; specialty: string }) {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => 
        u.id === data.id 
          ? { ...u, displayName: data.displayName, specialty: data.specialty } as any
          : u
      )
    }));
  }

  function handleDeleteMember(memberId: string) {
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== memberId)
    }));
    setDeleteConfirm(null);
  }

  function openEditModal(member: User) {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-4xl font-bold bg-gradient-brand bg-clip-text text-transparent mb-2">
            Team Members
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage your department team</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus size={18} />
          Add Member
        </motion.button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -5 }}
            className="card overflow-hidden group"
          >
            <div className="h-2 bg-gradient-brand" />
            <div className="card-padding">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {m.displayName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{m.displayName}</h3>
                  <p className="text-sm text-gray-500">@{m.username}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  m.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700'
                }`}>
                  {m.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                  <span className="text-xs text-gray-600">Specialty</span>
                  <span className="text-sm font-medium text-brand-1">
                    {(m as any).specialty || 'General'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">Can Create Tasks</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!m.canCreateTasks}
                      onChange={() => toggleCreate(m.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-600 peer-checked:to-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-4 border-t flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openEditModal(m)}
                  className="flex-1 btn btn-outline py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDeleteConfirm(m.id)}
                  className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full card card-padding text-center py-12">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 mb-4">No team members yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <UserPlus size={16} />
              Add Your First Member
            </button>
          </div>
        )}
      </div>
      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddMember}
        departmentCode={user?.departmentCode || ''}
      />
      
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMember(null);
        }}
        onSave={handleEditMember}
        member={selectedMember}
        departmentCode={user?.departmentCode || ''}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card w-full max-w-md shadow-2xl"
              >
                <div className="card-padding">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertCircle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Delete Member</h3>
                      <p className="text-sm text-gray-600">This action cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to delete this team member? All their tasks and data will be affected.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 btn btn-outline py-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteMember(deleteConfirm)}
                      className="flex-1 btn bg-red-600 text-white hover:bg-red-700 py-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
