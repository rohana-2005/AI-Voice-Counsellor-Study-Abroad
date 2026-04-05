'use client';
import { motion } from 'framer-motion';
import { MapPin, Clock, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';
import { useEffect, useState } from 'react';

const tagColors: Record<string, { bg: string; text: string }> = {
  blue:   { bg: '#eff6ff', text: '#1d4ed8' },
  green:  { bg: '#f0fdf4', text: '#15803d' },
  purple: { bg: '#f5f3ff', text: '#6d28d9' },
  orange: { bg: '#fff7ed', text: '#c2410c' },
  gray:   { bg: '#f8fafc', text: '#475569' },
};

export default function UniversityRecommendations() {
  const { session } = useAuthSession();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecs() {
      try {
        const defaultRes = await fetch('http://localhost:8000/api/v1/universities/default-recommendations?limit=3');
        const defaultData = await defaultRes.json().catch(() => []);
        if (defaultRes.ok && Array.isArray(defaultData) && defaultData.length > 0) {
          setRecommendations(defaultData);
        }

        if (session?.user?.id) {
          const res = await fetch(`http://localhost:8000/api/v1/students/${session.user.id}/recommendations`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setRecommendations(data);
            }
          }
        }
      } catch (err) {
        setError('Could not load university recommendations right now.');
      } finally {
        setLoading(false);
      }
    }
    loadRecs();
  }, [session?.user?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px 28px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>AI University Recommendations</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Matched to your profile &amp; goals</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {error && <span style={{ fontSize: '12px', color: '#ea580c' }}><AlertCircle size={12} style={{ display: 'inline-block' }} /> {error}</span>}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {loading ? (
             <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' }}>
               Generating matches based on your latest session...
             </div>
          ) : (
          recommendations.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '28px', textAlign: 'center', color: '#64748b' }}>
              No recommendations yet. Complete a counseling session to generate your top 3 universities.
            </div>
          ) : recommendations.map((uni: any, i: number) => {
            const tc = tagColors[uni.tagColor] || tagColors.gray;
            return (
              <motion.div
                key={uni.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Flag + name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{uni.flag}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  background: tc.bg, color: tc.text,
                  padding: '3px 8px', borderRadius: '999px',
                }}>
                  {uni.tag}
                </span>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.3 }}>{uni.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '10px' }}>
                <MapPin size={10} color="#94a3b8" />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{uni.country}</span>
              </div>

              {/* Course */}
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '6px 10px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 500, margin: 0 }}>{uni.course}</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Tuition', value: uni.tuition },
                  { label: 'Rank', value: uni.ranking },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 2px' }}>{s.label}</p>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Match */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <TrendingUp size={11} color="#16a34a" />
                <span style={{ fontSize: '10px', color: '#64748b', flex: 1 }}>Match</span>
                <div style={{ width: '48px', height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uni.match}%` }}
                    transition={{ duration: 1, delay: 0.4 }}
                    style={{ height: '100%', background: '#2563eb', borderRadius: '999px' }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>{uni.match}%</span>
              </div>

{/* Deadline & Reason */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} color="#94a3b8" />
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Deadline: <span style={{ fontWeight: 600, color: '#475569' }}>{uni.deadline || 'Rolling'}</span></span> 
                </div>
                {uni.reason && (
                  <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.3 }}>"{uni.reason}"</div>
                )}
              </div>
            </motion.div>
          );
        })
        )}
      </div>
    </motion.div>
  );
}
