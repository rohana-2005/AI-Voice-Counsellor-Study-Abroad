import DashboardPageClient from './DashboardPageClient';

export const metadata = {
  title: 'Dashboard – StudyAbroad.AI',
  description: 'Your personal study abroad dashboard with readiness scores, university recommendations, and AI session insights.',
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
