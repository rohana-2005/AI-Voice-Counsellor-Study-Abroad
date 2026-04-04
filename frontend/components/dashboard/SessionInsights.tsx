'use client';
import { motion } from 'framer-motion';
import { Mic, MessageSquare } from 'lucide-react';
import { recentSessions } from '@/lib/mockData';
import Link from 'next/link';

const sentimentCfg = {
  positive: { bg: '#f0fdf4', text: '#15803d', emoji: '😊', label: 'Positive' },
  neutral:  { bg: '#fffbeb', text: '#b45309', emoji: '😐', label: 'Neutral'  },
  negative: { bg: '#fef2f2', text: '#dc2626', emoji: '😔', label: 'Negative' },
};

const clsCfg = {
  Hot:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', emoji: '🔥' },
  Warm: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', emoji: '🌡️' },
  Cold: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', emoji: '❄️' },
};

export default function SessionInsights() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>📞 Session Insights</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Recent AI counseling sessions</p>
          </div>
        </div>
        <Link href="/session" style={{ textDecoration: 'none' }}>
          <button style={{
            fontSize: '12px', fontWeight: 500, color: '#475569',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
          }}>
            View All
          </button>
        </Link>
      </div>

      {/* Session cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {recentSessions.map((session, i) => {
          const sent = sentimentCfg[session.sentiment as keyof typeof sentimentCfg] || sentimentCfg.neutral;
          const cls  = clsCfg[session.classification];

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '14px', padding: '16px',
              }}
            >
              {/* Row 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Session #{session.id.split('_')[1]}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{session.date} · {session.duration}</p>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  background: cls.bg, color: cls.text, border: `1px solid ${cls.border}`,
                  padding: '4px 10px', borderRadius: '999px',
                }}>
                  {cls.emoji} {session.classification}
                </span>
              </div>

              {/* Preview */}
              <p style={{
                fontSize: '12px', color: '#64748b', lineHeight: 1.6, marginBottom: '12px',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {session.preview}
              </p>

              {/* Metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Lead</span>
                  <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${session.lead_score}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{ height: '100%', background: '#2563eb', borderRadius: '999px' }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>{session.lead_score}</span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  background: sent.bg, color: sent.text,
                  padding: '3px 8px', borderRadius: '999px',
                }}>
                  {sent.emoji} {sent.label}
                </span>
              </div>

              <Link href="/session" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', marginTop: '12px',
                  fontSize: '12px', fontWeight: 600, color: '#2563eb',
                  background: '#eff6ff', border: 'none', borderRadius: '8px',
                  padding: '8px', cursor: 'pointer',
                }}>
                  View Full Transcript →
                </button>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Start session CTA */}
      <Link href="/session" style={{ textDecoration: 'none' }}>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          style={{
            width: '100%', marginTop: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff', fontWeight: 600, padding: '14px 24px',
            borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '14px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          <Mic size={16} />
          Start AI Counseling Session
        </motion.button>
      </Link>
    </motion.div>
  );
}
