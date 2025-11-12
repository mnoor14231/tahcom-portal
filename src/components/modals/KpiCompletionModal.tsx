import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import type { KPI } from '../../types.ts';

interface KpiCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: KPI | null;
}

export function KpiCompletionModal({ isOpen, onClose, kpi }: KpiCompletionModalProps) {
  if (!kpi) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full pointer-events-auto overflow-hidden border-2 border-orange-200"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-orange-50 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-brand-1" />
              </button>

              {/* Content */}
              <div className="p-8 md:p-12">
                {/* Icon Section */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="relative"
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center border-4 border-orange-300 shadow-lg">
                      <Trophy size={48} className="text-white" />
                    </div>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles size={32} className="text-brand-2" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl font-bold text-center mb-4 text-brand-1"
                >
                  Congratulations!
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl md:text-2xl text-center mb-8 text-brand-2 font-medium"
                >
                  KPI Target Achieved
                </motion.p>

                {/* KPI Details Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 md:p-8 mb-8 border-2 border-orange-200 shadow-inner"
                >
                  <div className="text-center">
                    <h3 className="text-2xl md:text-3xl font-bold text-brand-1 mb-3">
                      {kpi.name}
                    </h3>
                    {kpi.description && (
                      <p className="text-brand-1/80 mb-6 text-lg">
                        {kpi.description}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-extrabold text-brand-1">
                          {kpi.currentValue}
                        </div>
                        <div className="text-sm text-brand-1/70 mt-1">Current</div>
                      </div>
                      <div className="text-3xl font-bold text-brand-2">/</div>
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-extrabold text-brand-1">
                          {kpi.target}
                        </div>
                        <div className="text-sm text-brand-1/70 mt-1">Target</div>
                      </div>
                      <div className="text-2xl font-bold text-brand-2 ml-2">
                        {kpi.unit}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <CheckCircle2 size={24} className="text-brand-1" />
                      <span className="text-lg font-semibold text-brand-1">
                        100% Complete
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Thank You Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <p className="text-lg md:text-xl text-brand-1 leading-relaxed mb-2 font-medium">
                    Thank you for your outstanding dedication and hard work!
                  </p>
                  <p className="text-base md:text-lg text-brand-1/80 leading-relaxed">
                    Your team's commitment to excellence has made this achievement possible.
                  </p>
                </motion.div>

                {/* Decorative Elements */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex justify-center gap-2 mt-8"
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 200 }}
                      className="w-2 h-2 rounded-full bg-brand-2"
                    />
                  ))}
                </motion.div>

                {/* Close Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 flex justify-center"
                >
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-gradient-brand text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
                  >
                    Continue
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

