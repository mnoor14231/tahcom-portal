import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, TrendingUp, Calendar, User, FileText, BarChart3, Calculator } from 'lucide-react';
import type { KPI } from '../../types.ts';

interface AddKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (kpi: Omit<KPI, 'id' | 'lastUpdated'>) => void;
  departmentCode: string;
  users: Array<{ id: string; displayName: string }>;
}

const KPI_CATEGORIES = [
  'Financial',
  'Customer',
  'Process',
  'People',
  'Growth',
  'Quality',
  'Efficiency',
  'Other'
];

const MEASUREMENT_METHODS = [
  'Count',
  'Percentage',
  'Currency',
  'Time',
  'Rating',
  'Other'
];

const TIMEFRAMES = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annually'
];

export function AddKpiModal({ isOpen, onClose, onAdd, departmentCode, users }: AddKpiModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('Count');
  const [unit, setUnit] = useState('count');
  const [target, setTarget] = useState<number>(100);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [timeframe, setTimeframe] = useState('Monthly');
  const [formula, setFormula] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    onAdd({
      departmentCode,
      name: name.trim(),
      description: description.trim() || undefined,
      unit,
      target,
      currentValue,
      ownerUserId: ownerUserId || undefined,
    });
    
    // Reset form
    resetForm();
    onClose();
  }

  function resetForm() {
    setName('');
    setDescription('');
    setCategory('');
    setMeasurementMethod('Count');
    setUnit('count');
    setTarget(100);
    setCurrentValue(0);
    setOwnerUserId('');
    setTimeframe('Monthly');
    setFormula('');
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
              className="card w-full max-w-4xl shadow-2xl my-8"
            >
              <div className="card-padding">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                      <Target className="text-brand-1" size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">
                        Create New KPI
                      </h3>
                      <p className="text-sm text-gray-600">{departmentCode} Department • SMART Criteria</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* SMART Criteria Info Banner */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">SMART KPI Guidelines</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        <span className="font-medium">Specific:</span> Clear and well-defined • 
                        <span className="font-medium"> Measurable:</span> Quantifiable target • 
                        <span className="font-medium"> Achievable:</span> Realistic goals • 
                        <span className="font-medium"> Relevant:</span> Aligned with objectives • 
                        <span className="font-medium"> Time-bound:</span> Defined timeframe
                      </p>
                    </div>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Row 1: Name and Category */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Target size={16} className="text-brand-1" />
                        KPI Name * <span className="text-xs text-gray-500 font-normal">(Specific & Clear)</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                        placeholder="e.g., Monthly Recurring Revenue Growth"
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <BarChart3 size={16} className="text-brand-1" />
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      >
                        <option value="">Select Category</option>
                        {KPI_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <FileText size={16} className="text-brand-1" />
                      Description <span className="text-xs text-gray-500 font-normal">(What does this KPI measure?)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                      placeholder="Describe what this KPI tracks and why it matters..."
                      rows={3}
                    />
                  </div>

                  {/* Row 2: Measurement Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Calculator size={16} className="text-brand-1" />
                        Measurement Method
                      </label>
                      <select
                        value={measurementMethod}
                        onChange={(e) => {
                          setMeasurementMethod(e.target.value);
                          // Auto-set unit based on method
                          if (e.target.value === 'Percentage') setUnit('%');
                          else if (e.target.value === 'Currency') setUnit('USD');
                          else if (e.target.value === 'Time') setUnit('hours');
                          else if (e.target.value === 'Count') setUnit('count');
                        }}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      >
                        {MEASUREMENT_METHODS.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        Unit *
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                        placeholder="e.g., %, count, USD"
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Calendar size={16} className="text-brand-1" />
                        Timeframe
                      </label>
                      <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      >
                        {TIMEFRAMES.map(tf => (
                          <option key={tf} value={tf}>{tf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Target and Current Values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <label className="flex items-center gap-2 text-sm font-medium mb-2 text-green-900">
                        <TrendingUp size={16} />
                        Target Value * <span className="text-xs text-green-700 font-normal">(Achievable Goal)</span>
                      </label>
                      <input
                        type="number"
                        value={target}
                        onChange={(e) => setTarget(Number(e.target.value))}
                        className="w-full rounded-lg border-green-300 focus:border-green-500 focus:ring-green-500 transition-colors bg-white"
                        placeholder="100"
                        required
                        min="0"
                        step="any"
                      />
                      <p className="text-xs text-green-700 mt-2">Set a realistic and achievable target</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <label className="flex items-center gap-2 text-sm font-medium mb-2 text-blue-900">
                        Current Value
                      </label>
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(Number(e.target.value))}
                        className="w-full rounded-lg border-blue-300 focus:border-blue-500 focus:ring-blue-500 transition-colors bg-white"
                        placeholder="0"
                        min="0"
                        step="any"
                      />
                      <p className="text-xs text-blue-700 mt-2">Current baseline or starting value</p>
                    </div>
                  </div>

                  {/* Row 4: Owner and Formula */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <User size={16} className="text-brand-1" />
                        KPI Owner
                      </label>
                      <select
                        value={ownerUserId}
                        onChange={(e) => setOwnerUserId(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      >
                        <option value="">Select Owner</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.displayName}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Person responsible for this KPI</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Calculator size={16} className="text-brand-1" />
                        Calculation Formula (Optional)
                      </label>
                      <input
                        type="text"
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                        placeholder="e.g., (New MRR - Lost MRR) / Total MRR"
                      />
                      <p className="text-xs text-gray-500 mt-1">How is this KPI calculated?</p>
                    </div>
                  </div>

                  {/* Progress Preview */}
                  {target > 0 && (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress Preview</span>
                        <span className="text-lg font-bold text-brand-1">
                          {Math.round((currentValue / target) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-brand transition-all duration-300"
                          style={{ width: `${Math.min(100, (currentValue / target) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>Current: {currentValue} {unit}</span>
                        <span>Target: {target} {unit}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 btn btn-outline py-3"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Target size={18} />
                      Create KPI
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

