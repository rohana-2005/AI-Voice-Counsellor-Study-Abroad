'use client';

import AdminDashboardLayout from '@/components/layout/AdminDashboardLayout';
import AdminUniversitiesPanel from '@/components/admin/AdminUniversitiesPanel';
import AdminPriorityQueue from '@/components/admin/AdminPriorityQueue';
import AdminCalendarCard from '@/components/admin/AdminCalendarCard';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

export default function AdminDashboardPageClient() {
  const { profile } = useAuthSession();
  const displayName = profile?.full_name?.trim() || 'Admin';

  return (
    <AdminDashboardLayout
      title={`Admin Dashboard · ${displayName}`}
      subtitle="Live ops for universities, students, and upcoming meetings"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        <div id="universities">
          <AdminUniversitiesPanel />
        </div>
        <div id="priority">
          <AdminPriorityQueue />
        </div>
        <div id="calendar">
          <AdminCalendarCard />
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
