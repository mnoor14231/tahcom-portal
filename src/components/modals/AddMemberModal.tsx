import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { displayName: string; username: string; specialty: string }) => void;
  departmentCode: string;
}

export function AddMemberModal({ isOpen, onClose, onAdd, departmentCode }: AddMemberModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [specialty, setSpecialty] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !specialty.trim()) return;
    onAdd({ displayName: displayName.trim(), username: username.trim(), specialty: specialty.trim() });
    setDisplayName('');
    setUsername('');
    setSpecialty('');
    onClose();
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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <UserPlus className="text-brand-1" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Add Team Member</h3>
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
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Specialty</label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      placeholder="e.g., Sales, Marketing, Development"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 btn btn-outline py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn btn-primary py-2 flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} />
                      Add Member
                    </button>
                  </div>
                </form>
                <p className="mt-4 text-xs text-gray-500">
                  Default password will be set to: <span className="font-mono font-semibold">123</span>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

