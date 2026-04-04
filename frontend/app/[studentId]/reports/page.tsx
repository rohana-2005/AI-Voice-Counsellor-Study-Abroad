'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type StudentSummary = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

type SessionReport = {
  id: string;
  created_at?: string | null;
  lead_score?: number | null;
  classification?: string | null;
  sentiment?: string | null;
  score_breakdown?: Record<string, number> | null;
  detailed_report?: string | null;
  transcript?: string | null;
};

type ReportsResponse = {
  student?: StudentSummary;
  reports?: SessionReport[];
};

export default function StudentReportsPage() {
  const { accessToken } = useAuthSession();
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId;

  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      if (!accessToken || !studentId) {
        setStudent(null);
        setReports([]);
        return;
      }

      setStatus('loading');
      setErrorMsg('');
      try {
        const url = `${backendBaseUrl}/api/v1/admin/students/${encodeURIComponent(studentId)}/reports?access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = (await res.json().catch(() => ({}))) as ReportsResponse & { detail?: string };

        if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.detail || `Failed to load reports (HTTP ${res.status}).`);
          setStudent(null);
          setReports([]);
          return;
        }

        setStudent(data.student || null);
        setReports(Array.isArray(data.reports) ? data.reports : []);
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Could not load reports.');
        setStudent(null);
        setReports([]);
      }
    };

    void loadReports();
  }, [accessToken, backendBaseUrl, studentId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Link
            href="/admin/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} /> Back to Admin Dashboard
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', color: '#64748b' }}>STUDENT REPORTS</p>
          <h1 style={{ margin: '6px 0 2px', fontSize: '22px', color: '#0f172a' }}>
            {student?.full_name || 'Student'}
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            ID: {studentId}
            {student?.email ? ` · ${student.email}` : ''}
          </p>
        </div>

        {status === 'loading' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', fontSize: '13px', color: '#475569' }}>
            Loading reports...
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '14px', padding: '16px', fontSize: '13px', color: '#9f1239' }}>
            {errorMsg || 'Could not load reports.'}
          </div>
        )}

        {status !== 'loading' && status !== 'error' && reports.length === 0 && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', textAlign: 'center', color: '#64748b' }}>
            <FileText size={20} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            No reports found for this student yet.
          </div>
        )}

        {reports.map((report) => (
          <div
            key={report.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              display: 'grid',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: 700 }}>
                Session ID: {report.id}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                {report.created_at ? new Date(report.created_at).toLocaleString() : 'Unknown timestamp'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '4px 10px' }}>
                Lead Score: {typeof report.lead_score === 'number' ? report.lead_score : 'N/A'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: '999px', padding: '4px 10px' }}>
                Classification: {report.classification || 'N/A'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '999px', padding: '4px 10px' }}>
                Sentiment: {report.sentiment || 'N/A'}
              </span>
            </div>

            <div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Score Breakdown</p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px',
                }}
              >
                {JSON.stringify(report.score_breakdown || {}, null, 2)}
              </pre>
            </div>

            <div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Detailed Report</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#1f2937', lineHeight: 1.55 }}>
                {report.detailed_report || 'No detailed report generated for this session.'}
              </p>
            </div>

            <details>
              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                View Transcript
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px',
                }}
              >
                {report.transcript || 'No transcript available.'}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
