'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import Link from 'next/link';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type PriorityStudent = {
  id: string;
  name: string;
  stage: string;
  priority: string;
};

export default function AdminPriorityQueue() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );
  const { accessToken } = useAuthSession();

  const [queue, setQueue] = useState<PriorityStudent[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      if (!accessToken) {
        setQueue([]);
        return;
      }
      setStatus('loading');
      try {
        const url = `${backendBaseUrl}/api/v1/admin/priority-queue?access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.students)) {
          setStatus('error');
          setQueue([]);
          return;
        }

        setQueue(
          data.students.map(
            (
              item: { id?: string; full_name?: string; stage?: string; priority?: string },
              index: number
            ) => ({
              id: item.id || `student-${index}`,
              name: item.full_name || 'Unnamed Student',
              stage: item.stage || 'Stage TBD',
              priority: item.priority || 'Normal',
            })
          )
        );
        setStatus('idle');
      } catch {
        setStatus('error');
        setQueue([]);
      }
    };

    void load();
  }, [accessToken, backendBaseUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: '320px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#fff7ed', display: 'grid', placeItems: 'center' }}>
            <Flame size={18} color="#ea580c" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Priority Queue</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Students needing attention</p>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ea580c' }}>{queue.length} in queue</span>
      </div>

      {status === 'loading' && (
        <div style={{ fontSize: '12px', color: '#64748b' }}>Loading priority students...</div>
      )}

      {status !== 'loading' && queue.length === 0 && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            No priority students yet. Queue details will show here once the admin workflow is wired.
          </p>
        </div>
      )}

      {queue.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {queue.map((student) => (
            <div
              key={student.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{student.name}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{student.stage}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c' }}>{student.priority}</span>
                <Link
                  href={`/${student.id}/reports`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1d4ed8',
                    background: '#dbeafe',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    textDecoration: 'none',
                  }}
                >
                  View Reports
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
