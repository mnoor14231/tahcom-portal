import { useState } from 'react';
import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { AddDepartmentModal } from '../components/modals/AddDepartmentModal.tsx';
import { ManageDepartmentModal } from '../components/modals/ManageDepartmentModal.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Eye, CheckCircle, Archive, Trash2, AlertCircle } from 'lucide-react';
import type { Department } from '../types.ts';
import { supabase } from '../lib/supabaseClient.ts';
import { buildAdminApiUrl } from '../utils/apiBase.ts';

const DEFAULT_MANAGER_PASSWORD = '1234';

export function DepartmentsPage() {
  const { user } = useAuth();
  const { state, setPreviewDepartment, setState, refreshDirectory } = useData();
  const isAdmin = hasRole(user, ['admin']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
 
  async function getAccessToken() {
    let { data, error } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token || error) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session?.access_token) {
        throw new Error('Session expired. Please sign in again.');
      }
      token = refreshData.session.access_token;
    }

    return token;
  }

  if (!isAdmin) return <div className="text-sm text-gray-600">Admins only.</div>;

  function handleAddDepartment(data: { name: string; code: string }) {
    const newDept = {
      id: `d_${Math.random().toString(36).slice(2, 9)}`,
      code: data.code,
      name: data.name,
      status: 'active' as const,
    };
    setState(prev => ({
      ...prev,
      departments: [...prev.departments, newDept]
    }));
  }

  function handleOpenManageModal(dept: Department) {
    setSelectedDepartment(dept);
    setIsManageModalOpen(true);
  }

  async function handleAssignManager(departmentId: string, managerUserId: string) {
    const department = state.departments.find(d => d.id === departmentId);
    if (!department) return;

    setState(prev => ({
      ...prev,
      departments: prev.departments.map(d =>
        d.id === departmentId ? { ...d, managerUserId } : d
      ),
      users: prev.users.map(u =>
        u.id === managerUserId ? { ...u, role: 'manager' as const, departmentCode: department.code } : u
      )
    }));
    setIsManageModalOpen(false);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(buildAdminApiUrl(`/api/admin/users/${managerUserId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role: 'manager',
          departmentCode: department.code,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to promote manager');
      }

      await refreshDirectory();
    } catch (error) {
      console.error('[DepartmentsPage] Failed to assign manager', error);
      await refreshDirectory();
    }
  }

  async function handleCreateNewManager(departmentId: string, managerName: string, username: string): Promise<{ ok: boolean; error?: string }> {
    const department = state.departments.find(d => d.id === departmentId);
    if (!department) {
      return { ok: false, error: 'Department not found.' };
    }

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(buildAdminApiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username,
          displayName: managerName,
          role: 'manager',
          departmentCode: department.code,
          temporaryPassword: DEFAULT_MANAGER_PASSWORD,
          canCreateTasks: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create manager');
      }

      const payload = await response.json();
      const createdUser = payload.user;

      setState(prev => ({
        ...prev,
        users: [...prev.users, createdUser],
        departments: prev.departments.map(d =>
          d.id === departmentId ? { ...d, managerUserId: createdUser.id } : d
        )
      }));
      await refreshDirectory();
      return { ok: true };
    } catch (error) {
      console.error('[DepartmentsPage] Failed to create manager', error);
      await refreshDirectory();
      const message = error instanceof Error ? error.message : 'Failed to create manager';
      return { ok: false, error: message };
    }
  }

  function handleDeleteDepartment(deptId: string) {
    const dept = state.departments.find(d => d.id === deptId);
    if (!dept) return;

    // Remove department, its KPIs, tasks, and optionally users
    setState(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d.id !== deptId),
      kpis: prev.kpis.filter(k => k.departmentCode !== dept.code),
      tasks: prev.tasks.filter(t => t.departmentCode !== dept.code),
      // Optionally: keep users but set them as unassigned
      users: prev.users.map(u => 
        u.departmentCode === dept.code 
          ? { ...u, departmentCode: undefined } 
          : u
      )
    }));
    setDeleteConfirm(null);
    
    // Reset preview if deleting current preview
    if (state.previewDepartmentCode === dept.code) {
      setPreviewDepartment(state.departments[0]?.code || '');
    }

    void (async () => {
      try {
        await refreshDirectory();
      } catch (error) {
        console.error('[DepartmentsPage] Failed to refresh after delete', error);
      }
    })();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-brand bg-clip-text text-transparent">
            Departments
          </h1>
          <p className="text-gray-600 mt-1">Manage your organization's departments</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary flex items-center gap-2 shadow-lg"
          onClick={() => setIsModalOpen(true)}
        >
          <Building2 size={18} />
          Add Department
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.departments.map((d, idx) => {
          const memberCount = state.users.filter(u => u.departmentCode === d.code).length;
          const manager = state.users.find(u => u.id === d.managerUserId);
          const kpiCount = state.kpis.filter(k => k.departmentCode === d.code).length;
          const isActive = d.status === 'active';
          const isPreviewing = state.previewDepartmentCode === d.code;

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              className={`card overflow-hidden group ${isPreviewing ? 'ring-2 ring-brand-1' : ''}`}
            >
              <div className="h-2 bg-gradient-brand" />
              <div className="card-padding">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{d.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-gradient-brand text-white">
                        {d.code}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isActive ? <CheckCircle size={12} /> : <Archive size={12} />}
                        {d.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Manager</span>
                    <span className="text-sm font-medium">{manager?.displayName || 'Unassigned'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <Users size={20} className="text-brand-1 mx-auto mb-1" />
                      <div className="text-lg font-bold text-brand-1">{memberCount}</div>
                      <div className="text-xs text-gray-600">Members</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-center">
                      <Building2 size={20} className="text-brand-2 mx-auto mb-1" />
                      <div className="text-lg font-bold text-brand-2">{kpiCount}</div>
                      <div className="text-xs text-gray-600">KPIs</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full btn flex items-center justify-center gap-2 ${
                      isPreviewing ? 'btn-primary' : 'btn-outline'
                    }`}
                    onClick={() => {
                      if (isPreviewing) {
                        handleOpenManageModal(d);
                      } else {
                        setPreviewDepartment(d.code);
                      }
                    }}
                  >
                    <Eye size={16} />
                    {isPreviewing ? 'Currently Viewing' : 'Preview Department'}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeleteConfirm(d.id)}
                    className="w-full btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Department
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AddDepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddDepartment}
      />
      
      <ManageDepartmentModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setSelectedDepartment(null);
        }}
        department={selectedDepartment}
        members={selectedDepartment ? state.users.filter(u => u.departmentCode === selectedDepartment.code) : []}
        onAssignManager={handleAssignManager}
        onCreateNewManager={handleCreateNewManager}
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
                      <h3 className="text-lg font-semibold">Delete Department</h3>
                      <p className="text-sm text-gray-600">This action cannot be undone</p>
                    </div>
                  </div>
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium mb-2">
                      Warning: This will delete:
                    </p>
                    <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                      <li>The department and all its settings</li>
                      <li>All KPIs associated with this department</li>
                      <li>All tasks associated with this department</li>
                      <li>Users will be unassigned from this department</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to permanently delete this department?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 btn btn-outline py-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleDeleteDepartment(deleteConfirm)}
                      className="flex-1 btn bg-red-600 text-white hover:bg-red-700 py-2"
                    >
                      Delete Department
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
