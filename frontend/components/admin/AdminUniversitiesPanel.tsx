'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type University = {
  id: string;
  name: string;
  country?: string | null;
};

export default function AdminUniversitiesPanel() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );
  const { accessToken } = useAuthSession();

  const [universities, setUniversities] = useState<University[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      if (!accessToken) {
        setUniversities([]);
        return;
      }
      setStatus('loading');
      try {
        const url = `${backendBaseUrl}/api/v1/universities?access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.universities)) {
          setStatus('error');
          setUniversities([]);
          return;
        }

        setUniversities(
          data.universities.map((item: { id?: string; name?: string; country?: string }, index: number) => ({
            id: item.id || `uni-${index}`,
            name: item.name || 'Unnamed University',
            country: item.country ?? null,
          }))
        );
        setStatus('idle');
      } catch {
        setStatus('error');
        setUniversities([]);
      }
    };

    void load();
  }, [accessToken, backendBaseUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
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
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eef2ff', display: 'grid', placeItems: 'center' }}>
            <Building2 size={18} color="#4f46e5" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Universities</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Managed listings</p>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}>{universities.length} total</span>
      </div>

      {status === 'loading' && (
        <div style={{ fontSize: '12px', color: '#64748b' }}>Loading universities...</div>
      )}

      {status !== 'loading' && universities.length === 0 && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            No universities are available yet. Once the admin data source is connected, they will appear here.
          </p>
        </div>
      )}

      {universities.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {universities.map((item) => (
            <div
              key={item.id}
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
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{item.name}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{item.country || 'Country TBD'}</p>
              </div>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Active</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
