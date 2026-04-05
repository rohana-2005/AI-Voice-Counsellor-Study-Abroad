'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentSummary from '@/components/dashboard/StudentSummary';
import ReadinessScore from '@/components/dashboard/ReadinessScore';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import CalendarCard from '@/components/dashboard/CalendarCard';
import UniversityRecommendations from '@/components/dashboard/UniversityRecommendations';
import SessionInsights from '@/components/dashboard/SessionInsights';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

const quickStats = [
  { label: 'Readiness Score', value: '78%', icon: 'RS', change: '+5% this week', positive: true },
  { label: 'Universities', value: '5', icon: 'UN', change: 'Matched today', positive: true },
  { label: 'Sessions', value: '2', icon: 'SE', change: 'Last: Apr 3', positive: true },
  { label: 'Next Deadline', value: '26 days', icon: 'DL', change: 'UCD · Apr 30', positive: false },
];

export default function DashboardPageClient() {
  const { profile } = useAuthSession();
  const firstName = profile?.full_name?.trim()?.split(' ')[0] || 'there';

  return (
    <DashboardLayout
      title={`Welcome back, ${firstName}`}
      subtitle="Your study abroad journey is on track · April 2026"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {quickStats.map((s) => (
          <div
            key={s.label}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px 22px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '6px' }}>{s.value}</p>
            <p style={{ fontSize: '12px', fontWeight: 500, color: s.positive ? '#16a34a' : '#d97706' }}>{s.change}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
        <StudentSummary />
        <ReadinessScore />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <KanbanBoard />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <CalendarCard />
        <SessionInsights />
      </div>

      <div>
        <UniversityRecommendations />
      </div>
    </DashboardLayout>
  );
}
