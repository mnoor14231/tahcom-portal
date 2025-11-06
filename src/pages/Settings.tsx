import { useState } from 'react';
import { useAuth, hasRole } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { FileDown, FileSpreadsheet, Users, Target, ListTodo } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export function SettingsPage() {
  const { user } = useAuth();
  const { state } = useData();
  const [exportStatus, setExportStatus] = useState<{ type: 'kpi' | 'task' | null; success: boolean } | null>(null);

  // Get user's department code
  const userDeptCode = user?.departmentCode || state.previewDepartmentCode;

  // Filter data based on user role
  const isAdmin = hasRole(user, ['admin']);
  const isManager = hasRole(user, ['manager']);
  const isMember = hasRole(user, ['member']);

  // Get relevant data based on user role
  const relevantKpis = isAdmin 
    ? state.kpis 
    : state.kpis.filter(k => k.departmentCode === userDeptCode);
  
  const relevantTasks = isAdmin 
    ? state.tasks 
    : state.tasks.filter(t => t.departmentCode === userDeptCode);

  const relevantDepartment = state.departments.find(d => d.code === userDeptCode);

  // Helper function to get user name by ID
  const getUserName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const user = state.users.find(u => u.id === userId);
    return user?.displayName || 'Unknown';
  };

  // Helper function to get KPI name by ID
  const getKpiName = (kpiId?: string) => {
    if (!kpiId) return 'N/A';
    const kpi = state.kpis.find(k => k.id === kpiId);
    return kpi?.name || 'Unknown';
  };

  function exportKpis() {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare KPI data
      const kpiData = relevantKpis.map((k, index) => {
        const progress = Math.round((k.currentValue / k.target) * 100);
        return {
          '#': index + 1,
          'KPI Name': k.name,
          'Description': k.description || 'N/A',
          'Department': state.departments.find(d => d.code === k.departmentCode)?.name || k.departmentCode,
          'Owner': getUserName(k.ownerUserId),
          'Unit': k.unit,
          'Target': k.target,
          'Current Value': k.currentValue,
          'Progress %': progress,
          'Status': progress >= 100 ? 'Achieved' : progress >= 70 ? 'On Track' : 'Behind',
          'Last Updated': new Date(k.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        };
      });

      // Add title rows first
      const ws = XLSX.utils.aoa_to_sheet([
        ['TAHCOM KPI REPORT'],
        [`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
        isAdmin ? [`Total KPIs: ${relevantKpis.length} (All Departments)`] : [`Department: ${relevantDepartment?.name || 'N/A'} | Total KPIs: ${relevantKpis.length}`],
        []
      ]);

      // Add data starting from row 5
      XLSX.utils.sheet_add_json(ws, kpiData, { origin: 'A5', skipHeader: false });

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 28 },  // KPI Name
        { wch: 40 },  // Description
        { wch: 22 },  // Department
        { wch: 20 },  // Owner
        { wch: 15 },  // Unit
        { wch: 12 },  // Target
        { wch: 14 },  // Current Value
        { wch: 12 },  // Progress %
        { wch: 15 },  // Status
        { wch: 15 }   // Last Updated
      ];

      // Apply styling to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Style title row (A1)
      if (!ws['A1'].s) ws['A1'].s = {};
      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FF8C00' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }]; // Merge title across all columns

      // Style subtitle rows (A2, A3)
      ['A2', 'A3'].forEach(cell => {
        if (!ws[cell]) ws[cell] = { t: 's', v: '' };
        ws[cell].s = {
          font: { sz: 11, color: { rgb: '666666' } },
          fill: { fgColor: { rgb: 'FFF7ED' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      });
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } });

      // Style header row (row 5)
      for (let col = 0; col <= 10; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: 'D2691E' } }, // Maroon/brown color
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }

      // Style data rows
      for (let row = 5; row <= range.e.r; row++) {
        const isEvenRow = (row - 5) % 2 === 0;
        const bgColor = isEvenRow ? 'FFFFFF' : 'FFF7ED'; // Alternating rows

        for (let col = 0; col <= 10; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellRef]) continue;

          // Get progress value to determine status color
          const progressCell = XLSX.utils.encode_cell({ r: row, c: 8 });
          const progress = ws[progressCell] ? Number(ws[progressCell].v) : 0;

          // Special styling for status column
          let cellBgColor = bgColor;
          let fontColor = '000000';
          if (col === 9) { // Status column
            if (progress >= 100) {
              cellBgColor = 'D4EDDA'; // Light green
              fontColor = '155724'; // Dark green
            } else if (progress >= 70) {
              cellBgColor = 'FFF3CD'; // Light yellow
              fontColor = '856404'; // Dark yellow
            } else {
              cellBgColor = 'F8D7DA'; // Light red
              fontColor = '721C24'; // Dark red
            }
          }

          ws[cellRef].s = {
            font: { sz: 10, color: { rgb: fontColor }, bold: col === 9 },
            fill: { fgColor: { rgb: cellBgColor } },
            alignment: { horizontal: col === 0 || col === 6 || col === 7 || col === 8 ? 'center' : 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'DDDDDD' } },
              bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
              left: { style: 'thin', color: { rgb: 'DDDDDD' } },
              right: { style: 'thin', color: { rgb: 'DDDDDD' } }
            }
          };
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'KPIs');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = isAdmin 
        ? `Tahcom_KPIs_All_Departments_${timestamp}.xlsx`
        : `Tahcom_KPIs_${relevantDepartment?.code || 'Department'}_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      // Show success message
      setExportStatus({ type: 'kpi', success: true });
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({ type: 'kpi', success: false });
      setTimeout(() => setExportStatus(null), 3000);
    }
  }

  function exportTasks() {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare Task data with proper formatting
      const taskData = relevantTasks.map((t, index) => {
        const assigneeNames = t.assigneeUserIds.map(id => getUserName(id)).join(', ');
        const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No due date';
        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';

        return {
          '#': index + 1,
          'Task Title': t.title,
          'Description': t.description || 'N/A',
          'Department': state.departments.find(d => d.code === t.departmentCode)?.name || t.departmentCode,
          'Assigned To': assigneeNames || 'Unassigned',
          'Priority': t.priority,
          'Status': t.status.replace('_', ' ').toUpperCase(),
          'Progress %': t.progressPercent || 0,
          'Due Date': dueDate,
          'Overdue': isOverdue ? 'Yes' : 'No',
          'Related KPI': getKpiName(t.relatedKpiId),
          'Comments': t.comments.length,
          'Attachments': t.attachments.length
        };
      });

      // Add title rows first
      const ws = XLSX.utils.aoa_to_sheet([
        ['TAHCOM TASK REPORT'],
        [`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
        isAdmin ? [`Total Tasks: ${relevantTasks.length} (All Departments)`] : [`Department: ${relevantDepartment?.name || 'N/A'} | Total Tasks: ${relevantTasks.length}`],
        []
      ]);

      // Add data starting from row 5
      XLSX.utils.sheet_add_json(ws, taskData, { origin: 'A5', skipHeader: false });

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 32 },  // Task Title
        { wch: 40 },  // Description
        { wch: 22 },  // Department
        { wch: 25 },  // Assigned To
        { wch: 12 },  // Priority
        { wch: 18 },  // Status
        { wch: 12 },  // Progress %
        { wch: 15 },  // Due Date
        { wch: 10 },  // Overdue
        { wch: 28 },  // Related KPI
        { wch: 10 },  // Comments
        { wch: 12 }   // Attachments
      ];

      // Apply styling to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Style title row (A1)
      if (!ws['A1'].s) ws['A1'].s = {};
      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FF8C00' } }, // Orange
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }]; // Merge title across all columns

      // Style subtitle rows (A2, A3)
      ['A2', 'A3'].forEach(cell => {
        if (!ws[cell]) ws[cell] = { t: 's', v: '' };
        ws[cell].s = {
          font: { sz: 11, color: { rgb: '666666' } },
          fill: { fgColor: { rgb: 'FFF7ED' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      });
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 12 } });
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 12 } });

      // Style header row (row 5)
      for (let col = 0; col <= 12; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: 'D2691E' } }, // Maroon/brown color
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }

      // Style data rows
      for (let row = 5; row <= range.e.r; row++) {
        const isEvenRow = (row - 5) % 2 === 0;
        const bgColor = isEvenRow ? 'FFFFFF' : 'FFF7ED'; // Alternating rows

        // Get cell values for conditional formatting
        const priorityCell = XLSX.utils.encode_cell({ r: row, c: 5 });
        const statusCell = XLSX.utils.encode_cell({ r: row, c: 6 });
        const overdueCell = XLSX.utils.encode_cell({ r: row, c: 9 });
        
        const priority = ws[priorityCell] ? String(ws[priorityCell].v) : '';
        const status = ws[statusCell] ? String(ws[statusCell].v) : '';
        const isOverdue = ws[overdueCell] ? String(ws[overdueCell].v) === 'Yes' : false;

        for (let col = 0; col <= 12; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellRef]) continue;

          // Determine cell styling based on content
          let cellBgColor = bgColor;
          let fontColor = '000000';
          let isBold = false;

          // Priority column styling
          if (col === 5) {
            if (priority === 'High') {
              cellBgColor = 'F8D7DA'; // Light red
              fontColor = '721C24'; // Dark red
              isBold = true;
            } else if (priority === 'Medium') {
              cellBgColor = 'FFF3CD'; // Light yellow
              fontColor = '856404'; // Dark yellow
            } else {
              cellBgColor = 'D1ECF1'; // Light blue
              fontColor = '0C5460'; // Dark blue
            }
          }

          // Status column styling
          if (col === 6) {
            if (status === 'COMPLETED') {
              cellBgColor = 'D4EDDA'; // Light green
              fontColor = '155724'; // Dark green
              isBold = true;
            } else if (status === 'IN PROGRESS') {
              cellBgColor = 'D1ECF1'; // Light blue
              fontColor = '0C5460'; // Dark blue
            } else if (status === 'PENDING APPROVAL') {
              cellBgColor = 'FFF3CD'; // Light yellow
              fontColor = '856404'; // Dark yellow
            } else {
              cellBgColor = 'E2E3E5'; // Light gray
              fontColor = '383D41'; // Dark gray
            }
          }

          // Overdue column styling
          if (col === 9 && isOverdue) {
            cellBgColor = 'F8D7DA'; // Light red
            fontColor = '721C24'; // Dark red
            isBold = true;
          }

          ws[cellRef].s = {
            font: { sz: 10, color: { rgb: fontColor }, bold: isBold },
            fill: { fgColor: { rgb: cellBgColor } },
            alignment: { horizontal: col === 0 || col === 7 || col === 11 || col === 12 ? 'center' : 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'DDDDDD' } },
              bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
              left: { style: 'thin', color: { rgb: 'DDDDDD' } },
              right: { style: 'thin', color: { rgb: 'DDDDDD' } }
            }
          };
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = isAdmin 
        ? `Tahcom_Tasks_All_Departments_${timestamp}.xlsx`
        : `Tahcom_Tasks_${relevantDepartment?.code || 'Department'}_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      // Show success message
      setExportStatus({ type: 'task', success: true });
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({ type: 'task', success: false });
      setTimeout(() => setExportStatus(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-brand-1" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">
            Settings & Export
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Export your data to Excel with professional formatting
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="card card-padding bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-5 h-5 text-brand-1" />
          <h3 className="font-semibold text-gray-900">Your Access Level</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="font-medium text-brand-1">Role:</span>
            <span className="px-3 py-1 bg-white rounded-full border border-orange-200 text-brand-1 font-medium">
              {user?.role.toUpperCase()}
            </span>
          </div>
          {!isAdmin && relevantDepartment && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-brand-1">Department:</span>
              <span className="text-gray-900 font-medium">{relevantDepartment.name}</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-orange-200">
            <p className="text-xs text-gray-600">
              {isAdmin && '✓ You can export data from all departments'}
              {isManager && '✓ You can export data from your department'}
              {isMember && '✓ You can export data from your department'}
            </p>
          </div>
        </div>
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI Statistics */}
        <div className="card card-padding border-l-4 border-l-brand-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-brand-1" />
            </div>
            <h3 className="font-semibold text-gray-900">KPI Data Available</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total KPIs:</span>
              <span className="text-2xl font-bold text-brand-1">{relevantKpis.length}</span>
            </div>
            {isAdmin && (
              <div className="text-xs text-gray-500 mt-2">
                Across {state.departments.filter(d => d.status === 'active').length} active departments
              </div>
            )}
          </div>
        </div>

        {/* Task Statistics */}
        <div className="card card-padding border-l-4 border-l-brand-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ListTodo className="w-5 h-5 text-brand-2" />
            </div>
            <h3 className="font-semibold text-gray-900">Task Data Available</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Tasks:</span>
              <span className="text-2xl font-bold text-brand-2">{relevantTasks.length}</span>
            </div>
            {isAdmin && (
              <div className="text-xs text-gray-500 mt-2">
                Across {state.departments.filter(d => d.status === 'active').length} active departments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="card card-padding">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-brand-1" />
          Export to Excel
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export KPIs Button */}
          <button
            onClick={exportKpis}
            disabled={relevantKpis.length === 0}
            className="group relative p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl hover:border-brand-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-full border-2 border-orange-200 group-hover:border-brand-1 transition-colors">
                <Target className="w-8 h-8 text-brand-1" />
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-1">Export KPIs</h4>
                <p className="text-xs text-gray-600">
                  {relevantKpis.length} KPI{relevantKpis.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="mt-2 px-4 py-2 bg-gradient-brand rounded-lg text-white text-sm font-medium group-hover:shadow-md transition-shadow">
                <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                Generate Excel
              </div>
            </div>
            
            {/* Success/Error indicator */}
            {exportStatus?.type === 'kpi' && (
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium ${
                exportStatus.success 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {exportStatus.success ? '✓ Downloaded' : '✗ Error'}
              </div>
            )}
          </button>

          {/* Export Tasks Button */}
          <button
            onClick={exportTasks}
            disabled={relevantTasks.length === 0}
            className="group relative p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl hover:border-brand-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-full border-2 border-orange-200 group-hover:border-brand-2 transition-colors">
                <ListTodo className="w-8 h-8 text-brand-2" />
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-1">Export Tasks</h4>
                <p className="text-xs text-gray-600">
                  {relevantTasks.length} task{relevantTasks.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="mt-2 px-4 py-2 bg-gradient-brand rounded-lg text-white text-sm font-medium group-hover:shadow-md transition-shadow">
                <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                Generate Excel
              </div>
            </div>
            
            {/* Success/Error indicator */}
            {exportStatus?.type === 'task' && (
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium ${
                exportStatus.success 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {exportStatus.success ? '✓ Downloaded' : '✗ Error'}
              </div>
            )}
          </button>
        </div>

     
      </div>

      {/* Permissions Info Card */}
      <div className="card card-padding bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">Access Levels & Permissions</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <span className="font-medium text-brand-1 min-w-[120px]">Admin:</span>
            <span>Manage departments, users, KPIs, and tasks. Export data from all departments.</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-brand-2 min-w-[120px]">Manager:</span>
            <span>Manage department KPIs and tasks. Export department data.</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-amber-600 min-w-[120px]">Member:</span>
            <span>View KPIs and tasks. Update task progress. Export department data.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
