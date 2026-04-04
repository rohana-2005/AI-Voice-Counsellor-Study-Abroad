'use client';
import { motion } from 'framer-motion';

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
    <div className={`relative ${sizes[size]} w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center`}>
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-blue-500/20"
            style={{ width: `${i * 30}%`, height: `${i * 30}%` }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      {/* Central avatar orb */}
      <motion.div
        className="relative z-10 w-28 h-28 rounded-full animate-pulse-glow"
        animate={{ scale: isActive ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 blur-md opacity-60" />
        
        {/* Inner face */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-blue-300/30">
          <div className="text-4xl">🤖</div>
        </div>

        {/* Speaking wave animation */}
        {isActive && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1 items-end">
            {[2, 4, 6, 4, 2].map((h, i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-blue-400 rounded-full"
                style={{ height: `${h * 3}px` }}
                animate={{ height: [`${h * 3}px`, `${h * 6}px`, `${h * 3}px`] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Status badge */}
      <div className="mt-10 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white/80 text-xs font-medium">AI Counselor Ready</span>
      </div>

      {/* Placeholder label */}
      <p className="mt-3 z-10 text-blue-300/60 text-xs text-center px-6">{label}</p>

      {/* Corner dots decoration */}
      <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-blue-400/40" />
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-400/40" />
      <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-blue-400/40" />
      <div className="absolute bottom-4 right-4 w-2 h-2 rounded-full bg-blue-400/40" />
    </div>
  );
}
