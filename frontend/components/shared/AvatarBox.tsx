'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface AvatarBoxProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isActive?: boolean;
}

export default function AvatarBox({ size = 'lg', label = 'AI Voice Avatar will stream here', isActive = false }: AvatarBoxProps) {
  const sizes = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-full min-h-[400px]',
  };

  return (
    <div className={`relative ${sizes[size]} w-full rounded-2xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center`}>
      {/* Background Image layers */}
      <div className="absolute inset-0">
        <img 
          src="/ai-avatar.png" 
          alt="AI Counselor Background" 
          className="w-full h-full object-cover opacity-40 blur-xl scale-110 saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
      </div>

      {/* Animated concentric rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-blue-500/20"
            style={{ width: `${i * 40}%`, height: `${i * 40}%` }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      {/* Central avatar */}
      <motion.div
        className="relative z-10 w-40 h-40 xl:w-48 xl:h-48 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white"
        animate={{ scale: isActive ? [1, 1.03, 1] : 1, boxShadow: isActive ? ['0 20px 25px -5px rgba(0, 0, 0, 0.1)', '0 20px 25px -5px rgba(59, 130, 246, 0.4)', '0 20px 25px -5px rgba(0, 0, 0, 0.1)'] : '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <img 
          src="/ai-avatar.png" 
          alt="AI Counselor" 
          className="w-full h-full object-cover object-[center_20%]"
        />

        {/* Speaking wave animation overlay */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-blue-900/60 to-transparent flex items-end justify-center pb-2 gap-1"
            >
              {[2, 4, 6, 4, 2].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-blue-100 rounded-full"
                  style={{ height: `${h * 3}px` }}
                  animate={{ height: [`${h * 2}px`, `${h * 5}px`, `${h * 2}px`] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status badge */}
      <div className="mt-8 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md shadow-sm border border-slate-200/50 rounded-full px-5 py-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`} />
        <span className="text-slate-700 text-xs font-semibold uppercase tracking-wider">{isActive ? 'Analyzing...' : 'AI Counselor Ready'}</span>
      </div>

      {/* Placeholder label */}
      <p className="mt-3 z-10 text-white font-medium text-xs text-center px-6 drop-shadow-md">{label}</p>
    </div>
  );
}
