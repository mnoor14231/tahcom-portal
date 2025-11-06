import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; code: string }) => void;
}

export function AddDepartmentModal({ isOpen, onClose, onAdd }: AddDepartmentModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  const isNameValid = name.trim().length >= 2;
  const isCodeValid = code.trim().length >= 2 && code.trim().length <= 5;
  const isFormValid = isNameValid && isCodeValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    onAdd({ name: name.trim(), code: code.trim().toUpperCase() });
    setName('');
    setCode('');
    setNameTouched(false);
    setCodeTouched(false);
    onClose();
  }

  function handleClose() {
    setName('');
    setCode('');
    setNameTouched(false);
    setCodeTouched(false);
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
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header with gradient accent */}
              <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 hover:bg-white/60 rounded-full transition-all duration-200 group"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-gray-600 group-hover:text-gray-900 transition-colors" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', duration: 0.6 }}
                    className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-200"
                  >
                    <Building2 className="text-white" size={28} />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Add New Department</h3>
                    <p className="text-sm text-gray-600">Create a new department in your organization</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form className="px-6 py-6 space-y-6" onSubmit={handleSubmit}>
                {/* Department Name Field */}
                <div className="relative">
                  <div className={`relative transition-all duration-200 ${
                    nameFocused ? 'transform scale-[1.01]' : ''
                  }`}>
                    <input
                      type="text"
                      id="dept-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => {
                        setNameFocused(false);
                        setNameTouched(true);
                      }}
                      className={`
                        w-full px-4 pt-6 pb-2 text-base rounded-xl border-2 transition-all duration-200
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
                      placeholder="Department Name"
                      required
                    />
                    <label
                      htmlFor="dept-name"
                      className={`
                        absolute left-4 transition-all duration-200 pointer-events-none
                        ${name || nameFocused
                          ? 'top-2 text-xs font-medium'
                          : 'top-4 text-base text-gray-500'
                        }
                        ${nameFocused ? 'text-orange-600' : 'text-gray-600'}
                      `}
                    >
                      Department Name
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
                  {!nameTouched && !nameFocused && (
                    <p className="text-xs text-gray-500 mt-2">e.g., Marketing, Finance, Operations</p>
                  )}
                </div>

                {/* Department Code Field */}
                <div className="relative">
                  <div className={`relative transition-all duration-200 ${
                    codeFocused ? 'transform scale-[1.01]' : ''
                  }`}>
                    <input
                      type="text"
                      id="dept-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onFocus={() => setCodeFocused(true)}
                      onBlur={() => {
                        setCodeFocused(false);
                        setCodeTouched(true);
                      }}
                      className={`
                        w-full px-4 pt-6 pb-2 text-base rounded-xl border-2 transition-all duration-200
                        peer placeholder-transparent focus:outline-none font-mono tracking-wider
                        ${codeFocused 
                          ? 'border-purple-500 shadow-lg shadow-purple-100' 
                          : codeTouched && !isCodeValid
                            ? 'border-red-300 bg-red-50/30'
                            : codeTouched && isCodeValid
                              ? 'border-green-300 bg-green-50/30'
                              : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      placeholder="Department Code"
                      maxLength={5}
                      required
                    />
                    <label
                      htmlFor="dept-code"
                      className={`
                        absolute left-4 transition-all duration-200 pointer-events-none
                        ${code || codeFocused
                          ? 'top-2 text-xs font-medium'
                          : 'top-4 text-base text-gray-500'
                        }
                        ${codeFocused ? 'text-purple-600' : 'text-gray-600'}
                      `}
                    >
                      Department Code
                    </label>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {code && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                        >
                          {code.length}/5
                        </motion.span>
                      )}
                      {codeTouched && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {isCodeValid ? (
                            <CheckCircle2 size={20} className="text-green-500" />
                          ) : (
                            <AlertCircle size={20} className="text-red-500" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                  {codeTouched && !isCodeValid && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-600 mt-2 flex items-center gap-1"
                    >
                      <AlertCircle size={12} />
                      Code must be 2-5 characters
                    </motion.p>
                  )}
                  {!codeTouched && !codeFocused && (
                    <p className="text-xs text-gray-500 mt-2">Short code (2-5 characters, auto-uppercase)</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={handleClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 font-medium text-gray-700 transition-all duration-200"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={!isFormValid}
                    whileHover={isFormValid ? { scale: 1.02 } : {}}
                    whileTap={isFormValid ? { scale: 0.98 } : {}}
                    className={`
                      flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                      flex items-center justify-center gap-2.5 shadow-lg
                      ${isFormValid
                        ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:shadow-xl hover:shadow-orange-200 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      }
                    `}
                  >
                    <Building2 size={20} />
                    Create Department
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

