'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, FileText, Download, X, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';
import { recentSessions } from '@/lib/mockData';

type Session = {
  id: string;
  created_at?: string | null;
  transcript?: string | null;
  sentiment?: string | null;
  lead_score?: number | null;
  classification?: 'Hot' | 'Warm' | 'Cold' | string | null;
  detailed_report?: string | null;
};

const sentimentCfg = {
  positive: { bg: '#f0fdf4', text: '#15803d', emoji: '', label: 'Positive' },
  neutral:  { bg: '#fffbeb', text: '#b45309', emoji: '', label: 'Neutral'  },
  negative: { bg: '#fef2f2', text: '#dc2626', emoji: '', label: 'Negative' },
};

const clsCfg = {
  Hot:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', emoji: '' },
  Warm: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', emoji: '' },
  Cold: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', emoji: '' },
};

// ─── PDF Modal ────────────────────────────────────────────────────────────────

function PdfModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  const pdfUrl = `${backendBase}/api/v1/sessions/${sessionId}/report-pdf`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            width: '100%',
            maxWidth: 860,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Modal header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText style={{ width: 16, height: 16, color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Session Report</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  ID: {sessionId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a
                href={pdfUrl}
                download={`session-report-${sessionId.slice(0, 8).toUpperCase()}.pdf`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600, color: '#1d4ed8',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 8, padding: '6px 12px',
                  textDecoration: 'none',
                }}
              >
                <Download style={{ width: 13, height: 13 }} />
                Download
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600, color: '#475569',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '6px 12px',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink style={{ width: 13, height: 13 }} />
                New tab
              </a>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: 14, height: 14, color: '#64748b' }} />
              </button>
            </div>
          </div>

          {/* PDF iframe */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {loading && !error && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f8fafc',
                zIndex: 2,
              }}>
                <Loader2 style={{ width: 32, height: 32, color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Loading report PDF…</p>
              </div>
            )}
            {error && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fef2f2', padding: 32,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', margin: 0 }}>Failed to load PDF</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{error}</p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#2563eb',
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 8, padding: '8px 16px', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <ExternalLink style={{ width: 13, height: 13 }} />
                  Open in new tab
                </a>
              </div>
            )}
            <iframe
              src={pdfUrl}
              title="Session Report PDF"
              style={{ width: '100%', height: '100%', minHeight: 540, border: 'none', display: 'block' }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError('Could not render PDF in this browser. Try downloading instead.'); }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionInsights() {
  const { profile } = useAuthSession();
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  // Fetch real sessions from backend
  const fetchSessions = useCallback(async () => {
    const studentId = profile?.student_id;
    if (!studentId) return;
    setLoadingSessions(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/students/${studentId}/sessions`);
      if (!res.ok) return;
      const data = await res.json() as { sessions?: Session[] };
      if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        setSessions(data.sessions);
      }
    } catch {
      // silently fall through to mock data
    } finally {
      setLoadingSessions(false);
    }
  }, [profile?.student_id, backendBase]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Build display sessions — use live data or fall back to mock
  const displaySessions = sessions.length > 0
    ? sessions.slice(0, 3).map((s) => ({
        id: s.id,
        label: `Session ${s.id.slice(0, 8).toUpperCase()}`,
        date: s.created_at
          ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : '—',
        duration: '—',
        sentiment: (s.sentiment ?? 'neutral') as string,
        lead_score: s.lead_score ?? 0,
        classification: (s.classification ?? 'Warm') as 'Hot' | 'Warm' | 'Cold',
        preview: s.detailed_report
          ? s.detailed_report.slice(0, 140) + (s.detailed_report.length > 140 ? '…' : '')
          : s.transcript
          ? s.transcript.slice(0, 140) + (s.transcript.length > 140 ? '…' : '')
          : 'Session report available.',
        hasReport: Boolean(s.detailed_report || s.transcript),
      }))
    : recentSessions.slice(0, 3).map((s) => ({
        id: s.id,
        label: `Session #${s.id.split('_')[1]}`,
        date: s.date,
        duration: s.duration,
        sentiment: s.sentiment,
        lead_score: s.lead_score,
        classification: s.classification as 'Hot' | 'Warm' | 'Cold',
        preview: s.preview,
        hasReport: false, // mock sessions have no real report
      }));

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
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Session Insights</h3>
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
          {displaySessions.map((session, i) => {
            const sent = sentimentCfg[session.sentiment as keyof typeof sentimentCfg] || sentimentCfg.neutral;
            const cls  = clsCfg[session.classification as keyof typeof clsCfg] || clsCfg.Warm;

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
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{session.label}</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                      {session.date}{session.duration !== '—' ? ` · ${session.duration}` : ''}
                    </p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* View Report / View Transcript */}
                  {session.hasReport ? (
                    <button
                      id={`view-report-btn-${session.id}`}
                      onClick={() => setModalSessionId(session.id)}
                      style={{
                        flex: 1,
                        fontSize: '12px', fontWeight: 600, color: '#2563eb',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '8px', padding: '8px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'background 0.15s',
                      }}
                    >
                      <FileText style={{ width: 13, height: 13 }} />
                      View Report
                    </button>
                  ) : (
                    <Link href="/session" style={{ flex: 1, textDecoration: 'none' }}>
                      <button style={{
                        width: '100%',
                        fontSize: '12px', fontWeight: 600, color: '#2563eb',
                        background: '#eff6ff', border: 'none', borderRadius: '8px',
                        padding: '8px', cursor: 'pointer',
                      }}>
                        View Full Transcript →
                      </button>
                    </Link>
                  )}

                  {/* Download PDF */}
                  {session.hasReport && (
                    <a
                      id={`download-pdf-btn-${session.id}`}
                      href={`${backendBase}/api/v1/sessions/${session.id}/report-pdf`}
                      download={`session-report-${session.id.slice(0, 8).toUpperCase()}.pdf`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        fontSize: '12px', fontWeight: 600, color: '#475569',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '8px', padding: '8px 12px',
                        textDecoration: 'none', flexShrink: 0,
                        transition: 'background 0.15s',
                      }}
                    >
                      <Download style={{ width: 13, height: 13 }} />
                      PDF
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}

          {displaySessions.length === 0 && !loadingSessions && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '32px 0', textAlign: 'center',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={20} color="#2563eb" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>No sessions yet</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Start your first AI counseling session below</p>
            </div>
          )}
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
