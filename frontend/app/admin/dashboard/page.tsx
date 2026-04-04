import type { Metadata } from 'next';
import AdminDashboardPageClient from './AdminDashboardPageClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard · StudyAbroad.AI',
  description: 'Monitor universities, student priorities, and upcoming meetings.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardPageClient />;
}
