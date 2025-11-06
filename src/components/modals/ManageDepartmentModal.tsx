import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCog, Users, Crown, CheckCircle2, AlertCircle, UserPlus, Building2, Info } from 'lucide-react';
import type { Department, User } from '../../types.ts';

interface ManageDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  members: User[];
  onAssignManager: (departmentId: string, managerUserId: string) => void;
  onCreateNewManager: (departmentId: string, managerName: string, username: string) => void;
}

export function ManageDepartmentModal({ 
  isOpen, 
  onClose, 
  department, 
  members, 
  onAssignManager,
  onCreateNewManager 
}: ManageDepartmentModalProps) {
  const [selectedMode, setSelectedMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerUsername, setNewManagerUsername] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  if (!department) return null;

  const currentManager = members.find(m => m.id === department.managerUserId);
  // Show all available members (filtering by department can be removed as members prop contains relevant users)
  const availableMembers = members;
  
  const isNameValid = newManagerName.trim().length >= 2;
  const isUsernameValid = newManagerUsername.trim().length >= 3 && /^[a-zA-Z0-9_]+$/.test(newManagerUsername.trim());
  const isFormValid = selectedMode === 'existing' 
    ? selectedUserId !== '' 
    : isNameValid && isUsernameValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!department || !isFormValid) return;
    
    if (selectedMode === 'existing' && selectedUserId) {
      onAssignManager(department.id, selectedUserId);
      resetForm();
      onClose();
    } else if (selectedMode === 'new' && isNameValid && isUsernameValid) {
      onCreateNewManager(department.id, newManagerName.trim(), newManagerUsername.trim());
      resetForm();
      onClose();
    }
  }

  function resetForm() {
    setNewManagerName('');
    setNewManagerUsername('');
    setSelectedUserId('');
    setNameTouched(false);
    setUsernameTouched(false);
  }

  function handleClose() {
    resetForm();
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              {/* Header with gradient */}
              <div className="relative px-5 pt-5 pb-3 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 p-2 hover:bg-white/60 rounded-full transition-all duration-200 group"
                  aria-label="Close modal"
                >
                  <X size={18} className="text-gray-600 group-hover:text-gray-900 transition-colors" />
                </button>
                <div className="flex items-start gap-3 pr-8">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', duration: 0.6 }}
                    className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-200"
                  >
                    <UserCog className="text-white" size={22} />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-0.5">Manage Department</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{department.name}</span>
                      <span className="px-2 py-0.5 bg-white/70 backdrop-blur rounded-full text-xs font-mono font-semibold text-gray-600">
                        {department.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-4">
                {/* Current Manager Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-orange-200/50 p-3.5 shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg shadow-md">
                        <Crown className="text-white" size={16} />
                      </div>
                      <span className="text-xs font-bold text-gray-800">Current Manager</span>
                    </div>
                    {currentManager ? (
                      <div className="pl-1">
                        <p className="text-base font-bold text-gray-900">{currentManager.displayName}</p>
                        <p className="text-xs text-gray-600 mt-0.5">@{currentManager.username}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pl-1">
                        <AlertCircle size={16} className="text-orange-600" />
                        <p className="text-sm font-semibold text-orange-700">Unassigned</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Available Members Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl bg-gradient-to-br from-orange-50/50 to-amber-50/50 border-2 border-orange-200/50 p-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg shadow-md">
                        <Users className="text-white" size={16} />
                      </div>
                      <span className="text-xs font-bold text-gray-800">Available Members</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-semibold">
                      {availableMembers.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {availableMembers.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 text-orange-600">
                        <Info size={14} />
                        <p className="text-xs italic">No members available</p>
                      </div>
                    ) : (
                      availableMembers.map(member => (
                        <motion.div 
                          key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-200/50 hover:border-orange-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{member.displayName}</p>
                              <p className="text-xs text-gray-500">@{member.username}</p>
                            </div>
                          </div>
                          {member.id === department.managerUserId && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 text-xs rounded-full font-semibold shadow-sm">
                              Manager
                            </span>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Assign/Reassign Manager Form */}
                <motion.form 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onSubmit={handleSubmit} 
                  className="space-y-4 pt-1"
                >
                  <div className="border-t-2 border-gray-100 pt-3">
                    <label className="block text-sm font-bold text-gray-800 mb-3">Assign/Reassign Manager</label>
                    
                    {/* Toggle between existing and new */}
                    <div className="flex gap-1.5 mb-3 p-1 bg-orange-100/50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode('existing');
                          resetForm();
                        }}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 ${
                          selectedMode === 'existing'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Select Existing Member
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode('new');
                          resetForm();
                        }}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 ${
                          selectedMode === 'new'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Create New Manager
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {selectedMode === 'existing' ? (
                        <motion.div
                          key="existing"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2"
                        >
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-sm font-medium bg-white"
                            required
                          >
                            <option value="">-- Select a member --</option>
                            {members.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.displayName} (@{member.username})
                              </option>
                            ))}
                          </select>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="new"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3.5"
                        >
                          {/* Manager Full Name */}
                          <div className="relative">
                            <div className={`relative transition-all duration-200 ${nameFocused ? 'transform scale-[1.01]' : ''}`}>
                              <input
                                type="text"
                                id="manager-name"
                                value={newManagerName}
                                onChange={(e) => setNewManagerName(e.target.value)}
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => {
                                  setNameFocused(false);
                                  setNameTouched(true);
                                }}
                                className={`
                                  w-full px-3 pt-5 pb-1.5 text-sm rounded-lg border-2 transition-all duration-200
                                  peer placeholder-transparent focus:outline-none
                                  ${nameFocused 
                                    ? 'border-orange-500 shadow-lg shadow-orange-100' 
                                    : nameTouched && !isNameValid
                                      ? 'border-red-300 bg-red-50/30'
                                      : nameTouched && isNameValid
                                        ? 'border-green-300 bg-green-50/30'
                                        : 'border-gray-200 hover:border-gray-300'
                                  }
                                `}
                                placeholder="Manager Full Name"
                                required
                              />
                              <label
                                htmlFor="manager-name"
                                className={`
                                  absolute left-3 transition-all duration-200 pointer-events-none
                                  ${newManagerName || nameFocused
                                    ? 'top-1.5 text-xs font-medium'
                                    : 'top-3 text-sm text-gray-500'
                                  }
                                  ${nameFocused ? 'text-orange-600' : 'text-gray-600'}
                                `}
                              >
                                Manager Full Name
                              </label>
                              {nameTouched && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  {isNameValid ? (
                                    <CheckCircle2 size={20} className="text-green-500" />
                                  ) : (
                                    <AlertCircle size={20} className="text-red-500" />
                                  )}
                                </motion.div>
                              )}
                            </div>
                            {nameTouched && !isNameValid && (
                              <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-red-600 mt-2 flex items-center gap-1"
                              >
                                <AlertCircle size={12} />
                                Please enter at least 2 characters
                              </motion.p>
                            )}
                          </div>

                          {/* Username */}
                          <div className="relative">
                            <div className={`relative transition-all duration-200 ${usernameFocused ? 'transform scale-[1.01]' : ''}`}>
                              <input
                                type="text"
                                id="manager-username"
                                value={newManagerUsername}
                                onChange={(e) => setNewManagerUsername(e.target.value.toLowerCase())}
                                onFocus={() => setUsernameFocused(true)}
                                onBlur={() => {
                                  setUsernameFocused(false);
                                  setUsernameTouched(true);
                                }}
                                className={`
                                  w-full px-3 pt-5 pb-1.5 text-sm rounded-lg border-2 transition-all duration-200
                                  peer placeholder-transparent focus:outline-none font-mono
                                  ${usernameFocused 
                                    ? 'border-amber-500 shadow-lg shadow-amber-100' 
                                    : usernameTouched && !isUsernameValid
                                      ? 'border-red-300 bg-red-50/30'
                                      : usernameTouched && isUsernameValid
                                        ? 'border-green-300 bg-green-50/30'
                                        : 'border-gray-200 hover:border-gray-300'
                                  }
                                `}
                                placeholder="Username"
                                required
                              />
                              <label
                                htmlFor="manager-username"
                                className={`
                                  absolute left-3 transition-all duration-200 pointer-events-none
                                  ${newManagerUsername || usernameFocused
                                    ? 'top-1.5 text-xs font-medium'
                                    : 'top-3 text-sm text-gray-500'
                                  }
                                  ${usernameFocused ? 'text-amber-600' : 'text-gray-600'}
                                `}
                              >
                                Username
                              </label>
                              {usernameTouched && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  {isUsernameValid ? (
                                    <CheckCircle2 size={20} className="text-green-500" />
                                  ) : (
                                    <AlertCircle size={20} className="text-red-500" />
                                  )}
                                </motion.div>
                              )}
                            </div>
                            {usernameTouched && !isUsernameValid && (
                              <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-red-600 mt-2 flex items-center gap-1"
                              >
                                <AlertCircle size={12} />
                                Username must be at least 3 characters (letters, numbers, underscores only)
                              </motion.p>
                            )}
                          </div>

                          {/* Info Note */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg"
                          >
                            <div className="flex gap-2">
                              <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-900 leading-relaxed">
                                <p className="font-semibold mb-0.5">Account Creation Details:</p>
                                <p>• Default password: <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">123</span></p>
                                <p>• Must change password on first login</p>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <motion.button
                      type="button"
                      onClick={handleClose}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 font-semibold text-gray-700 transition-all duration-200 text-sm"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={!isFormValid}
                      whileHover={isFormValid ? { scale: 1.02 } : {}}
                      whileTap={isFormValid ? { scale: 0.98 } : {}}
                      className={`
                        flex-1 px-4 py-2.5 rounded-lg font-bold transition-all duration-200
                        flex items-center justify-center gap-2 shadow-lg text-sm
                        ${isFormValid
                          ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:shadow-xl hover:shadow-orange-200 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        }
                      `}
                    >
                      {selectedMode === 'existing' ? (
                        <>
                          <UserCog size={18} />
                          Assign Manager
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Create & Assign
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

