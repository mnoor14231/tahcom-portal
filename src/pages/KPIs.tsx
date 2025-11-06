import { useMemo, useState } from 'react';
import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import type { KPI } from '../types.ts';
import { computeProgress } from '../data/seed.ts';
import { motion } from 'framer-motion';
import { LayoutGrid, Table, Trash2, TrendingUp, Target, Sparkles, Info } from 'lucide-react';
import { AddKpiModal } from '../components/modals/AddKpiModal.tsx';

function statusColor(p: number) {
  if (p >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (p >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function progressBarColor(p: number) {
  if (p >= 80) return 'bg-green-500';
  if (p >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function KPIsPage() {
  const { user } = useAuth();
  const { state, updateKpi, addKpi, deleteKpi, addActivity } = useData();
  const isManager = hasRole(user, ['manager']);

  const scopeDept = user?.role === 'admin' ? state.previewDepartmentCode : user?.departmentCode;
  const source = useMemo(() => state.kpis.filter(k => k.departmentCode === scopeDept), [state.kpis, scopeDept]);
  const deptUsers = state.users.filter(u => u.departmentCode === scopeDept && u.role !== 'admin');
  const [view, setView] = useState<'card' | 'table'>('card');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDescription, setShowDescription] = useState<string | null>(null);

  function onInlineChange(id: string, key: keyof KPI, value: string) {
    const kpi = source.find(k => k.id === id);
    if (!kpi) return;
    const oldValue = key === 'target' || key === 'currentValue' ? String(kpi[key]) : kpi[key] as string;
    const next: KPI = { ...kpi };
    if (key === 'target' || key === 'currentValue') {
      (next as any)[key] = Number(value) || 0;
    } else {
      (next as any)[key] = value;
    }
    next.lastUpdated = new Date().toISOString();
    updateKpi(next);
    
    // Log activity
    addActivity({
      departmentCode: scopeDept!,
      userId: user?.id || '',
      type: 'kpi_updated',
      description: `Updated "${kpi.name}" - ${key}: ${oldValue} → ${value}`,
      relatedKpiId: id,
    });
  }

  function handleAddKpi(kpiData: Omit<KPI, 'id' | 'lastUpdated'>) {
    const newKpi: KPI = {
      ...kpiData,
      id: `k_${Math.random().toString(36).slice(2, 9)}`,
      lastUpdated: new Date().toISOString(),
    };
    addKpi(newKpi);
    
    // Log activity
    addActivity({
      departmentCode: newKpi.departmentCode,
      userId: user?.id || '',
      type: 'kpi_updated',
      description: `Created new KPI: "${newKpi.name}"`,
      relatedKpiId: newKpi.id,
    });
  }

  function handleDeleteKpi(id: string) {
    if (!confirm('Delete this KPI?')) return;
    deleteKpi(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-brand bg-clip-text text-transparent mb-2">
            Key Performance Indicators
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Target size={18} className="text-brand-1" />
            Track and manage your department KPIs with SMART criteria
          </p>
        </div>
        {isManager && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary flex items-center gap-2 shadow-lg"
            onClick={() => setIsModalOpen(true)}
          >
            <Sparkles size={18} />
            Add KPI
          </motion.button>
        )}
      </div>

      <div className="card card-padding">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('card')}
            className={`btn flex items-center gap-2 ${view === 'card' ? 'btn-primary' : 'btn-outline'}`}
          >
            <LayoutGrid size={16} />
            Card View
          </button>
          <button
            onClick={() => setView('table')}
            className={`btn flex items-center gap-2 ${view === 'table' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Table size={16} />
            Table View
          </button>
        </div>
      </div>

      {view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {source.map((k, idx) => {
            const p = computeProgress(k.currentValue, k.target);
            const owner = state.users.find(u => u.id === k.ownerUserId);
            return (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)' }}
                className="card overflow-hidden group relative"
              >
                {/* Top colored bar with gradient */}
                <div className={`h-3 ${progressBarColor(p)} relative`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
                
                <div className="card-padding">
                  {/* Header with icon badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                          <Target size={16} className="text-brand-1" />
                        </div>
                        <h3 className="font-bold text-gray-900 flex-1">
                          {isManager ? (
                            <input
                              className="font-bold border-none focus:ring-2 focus:ring-brand-1 rounded px-2 -ml-2 w-full bg-transparent"
                              defaultValue={k.name}
                              onBlur={e => onInlineChange(k.id, 'name', e.target.value)}
                            />
                          ) : (
                            k.name
                          )}
                        </h3>
                        {/* Description info button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowDescription(showDescription === k.id ? null : k.id)}
                          className="p-1.5 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                          title="View Description"
                        >
                          <Info size={16} />
                        </motion.button>
                      </div>
                      
                      {/* Description dropdown */}
                      {showDescription === k.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <p className="text-xs text-blue-900 leading-relaxed">
                            {k.description || 'No description available for this KPI.'}
                          </p>
                        </motion.div>
                      )}
                      
                      {owner && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold">
                            {owner.displayName.charAt(0)}
                          </div>
                          <p className="text-xs text-gray-600 font-medium">{owner.displayName}</p>
                        </div>
                      )}
                    </div>
                    {isManager && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteKpi(k.id)}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Enhanced value display with better spacing */}
                    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                      <div className="grid grid-cols-7 gap-3 items-center">
                        {/* Current Value */}
                        <div className="col-span-3 text-center">
                          <label className="text-xs text-blue-600 font-semibold block uppercase tracking-wide mb-3">Current</label>
                          {isManager ? (
                            <input
                              type="number"
                              className="w-full text-center text-3xl font-extrabold border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-2 bg-transparent text-blue-900"
                              defaultValue={k.currentValue}
                              onBlur={e => onInlineChange(k.id, 'currentValue', e.target.value)}
                            />
                          ) : (
                            <div className="text-3xl font-extrabold text-blue-900">{k.currentValue}</div>
                          )}
                        </div>
                        
                        {/* Divider */}
                        <div className="col-span-1 text-center">
                          <div className="text-3xl font-bold text-gray-400">/</div>
                        </div>
                        
                        {/* Target Value */}
                        <div className="col-span-3 text-center">
                          <label className="text-xs text-green-600 font-semibold block uppercase tracking-wide mb-3">Target</label>
                          {isManager ? (
                            <input
                              type="number"
                              className="w-full text-center text-3xl font-extrabold border-none focus:ring-2 focus:ring-green-500 rounded px-2 py-2 bg-transparent text-green-900"
                              defaultValue={k.target}
                              onBlur={e => onInlineChange(k.id, 'target', e.target.value)}
                            />
                          ) : (
                            <div className="text-3xl font-extrabold text-green-900">{k.target}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Unit - Separate Row */}
                      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                        <label className="text-xs text-brand-1 font-semibold block uppercase tracking-wide mb-2">Unit</label>
                        {isManager ? (
                          <input
                            className="w-full text-center text-base font-bold border-none focus:ring-2 focus:ring-brand-1 rounded px-3 py-1 bg-transparent text-brand-1"
                            defaultValue={k.unit}
                            onBlur={e => onInlineChange(k.id, 'unit', e.target.value)}
                          />
                        ) : (
                          <div className="text-base font-bold text-brand-1">{k.unit}</div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Progress bar with glow */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-brand-1" />
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Progress</span>
                        </div>
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-bold bg-gradient-brand bg-clip-text text-transparent"
                        >
                          {p}%
                        </motion.span>
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={`h-3 rounded-full ${progressBarColor(p)} relative`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Footer with status and date */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${statusColor(p)} shadow-sm`}>
                          {p >= 80 ? '🎯 Excellent' : p >= 50 ? '📈 On Track' : '⚠️ Needs Focus'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Last updated</div>
                        <div className="text-xs font-semibold text-gray-700">
                          {new Date(k.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {source.length === 0 && (
            <div className="col-span-full card card-padding text-center py-12">
              <TrendingUp size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-2">No KPIs yet</p>
              <p className="text-sm text-gray-400 mb-4">Get started by creating your first KPI with SMART criteria</p>
              {isManager && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary mt-4 inline-flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Add Your First KPI
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">KPI Name</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Current</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                {isManager && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {source.map((k, idx) => {
                const p = computeProgress(k.currentValue, k.target);
                return (
                  <motion.tr
                    key={k.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {isManager ? (
                        <input
                          className="font-medium border-none focus:ring-2 focus:ring-brand-1 rounded px-1 -ml-1 w-full"
                          defaultValue={k.name}
                          onBlur={e => onInlineChange(k.id, 'name', e.target.value)}
                        />
                      ) : (
                        <span className="font-medium">{k.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isManager ? (
                        <input
                          className="rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 w-24"
                          defaultValue={k.unit}
                          onBlur={e => onInlineChange(k.id, 'unit', e.target.value)}
                        />
                      ) : (
                        k.unit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isManager ? (
                        <input
                          type="number"
                          className="rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 w-24"
                          defaultValue={String(k.target)}
                          onBlur={e => onInlineChange(k.id, 'target', e.target.value)}
                        />
                      ) : (
                        k.target
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isManager ? (
                        <input
                          type="number"
                          className="rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 w-24"
                          defaultValue={String(k.currentValue)}
                          onBlur={e => onInlineChange(k.id, 'currentValue', e.target.value)}
                        />
                      ) : (
                        k.currentValue
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${progressBarColor(p)}`} style={{ width: `${p}%` }} />
                        </div>
                        <span className="font-medium">{p}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(p)}`}>
                        {p >= 80 ? 'Excellent' : p >= 50 ? 'On Track' : 'Below'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(k.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    {isManager && (
                      <td className="px-4 py-3">
                        <button
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                          onClick={() => handleDeleteKpi(k.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {source.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="px-4 py-12 text-center text-gray-400">
                    No KPIs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddKpiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddKpi}
        departmentCode={scopeDept || ''}
        users={deptUsers}
      />
    </div>
  );
}
