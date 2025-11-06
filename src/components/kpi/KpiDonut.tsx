import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(ArcElement, Tooltip, Legend);

function statusColor(p: number): string {
  if (p >= 80) return '#16a34a'; // green
  if (p >= 50) return '#f59e0b'; // amber
  return '#dc2626'; // red
}

function statusGradient(p: number): string {
  if (p >= 80) return 'from-green-400 to-emerald-600';
  if (p >= 50) return 'from-amber-400 to-orange-600';
  return 'from-red-400 to-rose-600';
}

export function KpiDonut({ percent, label, size = 'default' }: { percent: number; label?: string; size?: 'default' | 'large' }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const bg = statusColor(clamped);
  const gradient = statusGradient(clamped);
  
  const sizeClasses = size === 'large' ? 'w-40 h-40' : 'w-28 h-28';
  const textSize = size === 'large' ? 'text-3xl' : 'text-xl';
  
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`${sizeClasses} relative`}
      >
        {/* Subtle glow effect - reduced opacity */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-5 blur-lg`} />
        
        {/* Chart Container */}
        <div className="relative w-full h-full">
          <Doughnut
            data={{
              labels: ['Progress', 'Remaining'],
              datasets: [
                { 
                  data: [clamped, 100 - clamped], 
                  backgroundColor: [bg, '#e5e7eb'], 
                  borderWidth: 0,
                  borderRadius: 8,
                },
              ],
            }}
            options={{ 
              responsive: true,
              maintainAspectRatio: true,
              cutout: '75%', 
              plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: false } 
              },
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeInOutQuart',
              }
            }}
          />
          
          {/* Centered Text - Absolute positioning */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <div className={`${textSize} font-extrabold bg-gradient-to-r ${gradient} bg-clip-text text-transparent leading-none`}>
              {clamped}%
            </div>
            {label && <div className="text-xs text-gray-600 font-medium mt-1">{label}</div>}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}


