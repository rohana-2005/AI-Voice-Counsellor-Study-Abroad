'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export default function ProgressCircle({
  percentage,
  size = 200,
  strokeWidth = 14,
  label = 'Score',
  color = '#2563eb',
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 75) return '#2563eb';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const activeColor = color || getColor(percentage);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background SVG */}
      <svg width={size} height={size} className="absolute">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
      </svg>

      {/* Progress SVG */}
      <svg
        width={size}
        height={size}
        className="absolute"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>

      {/* Glow effect */}
      <svg width={size} height={size} className="absolute opacity-30" style={{ transform: 'rotate(-90deg)' }}>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth * 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          filter="blur(4px)"
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 text-center">
        <motion.div
          className="text-4xl font-bold text-slate-800"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {percentage}%
        </motion.div>
        <div className="text-sm text-slate-500 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}
