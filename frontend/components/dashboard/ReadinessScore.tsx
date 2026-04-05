'use client';
import { motion } from 'framer-motion';
import ProgressCircle from '@/components/shared/ProgressCircle';
import { callSession } from '@/lib/mockData';

const breakdown = [
  { label: 'Academic Score',  key: 'academic'  as const, color: '#2563eb', bg: '#eff6ff', desc: 'GPA, field relevance' },
  { label: 'Financial Score', key: 'financial' as const, color: '#16a34a', bg: '#f0fdf4', desc: 'Budget, scholarship eligibility' },
  { label: 'Clarity Score',   key: 'clarity'   as const, color: '#7c3aed', bg: '#f5f3ff', desc: 'Goals, decision readiness' },
];

const clsCfg = {
  Hot:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', emoji: '' },
  Warm: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', emoji: '' },
  Cold: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', emoji: '' },
};

export default function ReadinessScore() {
  const cls = clsCfg[callSession.classification];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Study Abroad Readiness</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Based on latest counseling session</p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 700,
          padding: '6px 14px', borderRadius: '999px',
          background: cls.bg, color: cls.text,
          border: `1px solid ${cls.border}`,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: cls.text, display: 'inline-block' }} />
          {cls.emoji} {callSession.classification} Lead
        </span>
      </div>

      {/* Score circle + breakdown */}
      <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
        {/* Circle */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ProgressCircle percentage={callSession.lead_score} size={164} strokeWidth={13} label="Overall" />
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
            Last session: {callSession.date}
          </p>
        </div>

        {/* Breakdown bars */}
        <div style={{ flex: 1 }}>
          {breakdown.map((item) => {
            const score = callSession.score_breakdown[item.key];
            return (
              <div key={item.key} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{item.desc}</p>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{score}%</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    style={{ height: '100%', background: item.color, borderRadius: '999px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{
        marginTop: '24px', padding: '16px 18px',
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px',
      }}>
        <p style={{ fontSize: '13px', color: '#1d4ed8', lineHeight: 1.6, margin: 0 }}>
          <span style={{ fontWeight: 700 }}>AI Insight: </span>
          {callSession.insight_text}
        </p>
      </div>
    </motion.div>
  );
}
