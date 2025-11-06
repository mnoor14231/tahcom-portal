import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { computeProgress } from '../data/seed.ts';
import { KpiDonut } from '../components/kpi/KpiDonut.tsx';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Target, Activity, MessageSquare, CheckCircle2, FileEdit, Zap } from 'lucide-react';
import type { ActivityType } from '../types.ts';

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'task_completed': return <CheckCircle2 size={16} />;
    case 'task_created': return <FileEdit size={16} />;
    case 'task_comment': return <MessageSquare size={16} />;
    case 'kpi_updated': return <TrendingUp size={16} />;
    case 'task_status_changed': return <Zap size={16} />;
    default: return <Activity size={16} />;
  }
}

function getActivityColor(type: ActivityType) {
  switch (type) {
    case 'task_completed': return 'text-green-600 bg-green-50';
    case 'task_created': return 'text-brand-2 bg-orange-50';
    case 'task_comment': return 'text-brand-1 bg-orange-50';
    case 'kpi_updated': return 'text-orange-600 bg-orange-50';
    case 'task_status_changed': return 'text-amber-600 bg-amber-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function DashboardPage() {
  const { user } = useAuth();
  const { state } = useData();

  const isAdmin = hasRole(user, ['admin']);
  const scopeDept = isAdmin ? state.previewDepartmentCode : user?.departmentCode;
  const kpis = state.kpis.filter(k => k.departmentCode === scopeDept).slice(0, 3);
  const tasks = state.tasks.filter(t => t.departmentCode === scopeDept);

  const open = tasks.filter(t => t.status === 'backlog' || t.status === 'in_progress').length;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending_approval').length;

  // Get recent activities for this department
  const recentActivities = state.activities
    .filter(a => a.departmentCode === scopeDept)
    .slice(0, 5);

  if (isAdmin) {
    // Admin dashboard: show per-department KPI overview cards with overall progress
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-brand bg-clip-text text-transparent">
              Department Overview
            </h1>
            <p className="text-gray-600 mt-1">Monitor performance across all departments</p>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200"
          >
            <Users size={20} className="text-brand-1" />
            <span className="text-sm font-medium text-gray-700">{state.departments.length} Departments</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {state.departments.map((dept, idx) => {
            const dkpis = state.kpis.filter(k => k.departmentCode === dept.code);
            // Calculate overall department progress: average of all KPI progress percentages
            const overallProgress = dkpis.length > 0
              ? Math.round(dkpis.reduce((sum, k) => sum + computeProgress(k.currentValue, k.target), 0) / dkpis.length)
              : 0;
            
            const statusColor = overallProgress >= 80 ? 'from-green-500 to-emerald-600' 
              : overallProgress >= 50 ? 'from-amber-500 to-orange-600' 
              : 'from-red-500 to-rose-600';

            return (
              <motion.div
                key={dept.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="relative group"
              >
                <div className="card overflow-hidden">
                  {/* Gradient header */}
                  <div className={`h-2 bg-gradient-to-r ${statusColor}`} />
                  
                  <div className="card-padding">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{dept.name}</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Target size={14} />
                            {dkpis.length} KPIs
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Users size={14} />
                            {state.users.filter(u => u.departmentCode === dept.code).length} Members
                          </span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${statusColor} text-white shadow-lg`}>
                        {dept.code}
                      </div>
                    </div>

                    {/* Large centered donut - clean design */}
                    <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                      <div className="mb-6">
                        <KpiDonut percent={overallProgress} label="" size="large" />
                      </div>
                      
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-2">
                          <div className={`w-2 h-2 rounded-full ${overallProgress >= 80 ? 'bg-green-500' : overallProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <p className="text-sm font-bold text-gray-800">Overall Performance</p>
                        </div>
                        <p className={`text-base font-bold ${overallProgress >= 80 ? 'text-green-600' : overallProgress >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {overallProgress >= 80 ? '🎯 Excellent' : overallProgress >= 50 ? '📈 On Track' : '⚠️ Needs Attention'}
                        </p>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                      <div className="bg-orange-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-brand-1">{dkpis.filter(k => computeProgress(k.currentValue, k.target) >= 80).length}</div>
                        <div className="text-xs text-gray-600">Excellent</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-amber-600">{dkpis.filter(k => {
                          const p = computeProgress(k.currentValue, k.target);
                          return p >= 50 && p < 80;
                        }).length}</div>
                        <div className="text-xs text-gray-600">Fair</div>
                      </div>
                      <div className="bg-red-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-red-600">{dkpis.filter(k => computeProgress(k.currentValue, k.target) < 50).length}</div>
                        <div className="text-xs text-gray-600">Below</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-brand bg-clip-text text-transparent mb-1">
          Welcome back, {user?.displayName}
        </h1>
        <p className="text-gray-600">Here's what's happening with your KPIs today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="card card-padding hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0">
                <KpiDonut percent={computeProgress(kpi.currentValue, kpi.target)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm mb-2">{kpi.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{kpi.currentValue}</span>
                  <span className="text-gray-400 text-lg">/</span>
                  <span className="text-lg font-semibold text-gray-600">{kpi.target}</span>
                  <span className="text-xs font-medium text-gray-500">{kpi.unit}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t">
              Updated {new Date(kpi.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-padding"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-brand-1" size={20} />
            <span className="font-bold text-gray-900">Task Summary</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
              <div className="text-2xl font-bold text-brand-1">{open}</div>
              <div className="text-xs font-medium text-brand-1 mt-1">Open</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{overdue}</div>
              <div className="text-xs font-medium text-red-700 mt-1">Overdue</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">{pending}</div>
              <div className="text-xs font-medium text-amber-700 mt-1">Pending</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-padding lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="text-brand-1" size={20} />
              <span className="font-bold text-gray-900">Activity Feed</span>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Latest Updates
            </span>
          </div>
          {recentActivities.length > 0 ? (
            <ul className="space-y-2">
              {recentActivities.map((a, idx) => {
                const activityUser = state.users.find(u => u.id === a.userId);
                const timeAgo = new Date(a.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-start gap-3 text-sm p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
                  >
                    <div className={`mt-0.5 p-2 rounded-lg ${getActivityColor(a.type)}`}>
                      {getActivityIcon(a.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {activityUser?.displayName.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-gray-900">{activityUser?.displayName || 'Unknown User'}</span>
                      </div>
                      <p className="text-gray-700 font-medium mb-1 leading-relaxed">{a.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">{activityUser?.role || 'member'}</span>
                        <span>•</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1">Activities will appear here when tasks are updated</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
