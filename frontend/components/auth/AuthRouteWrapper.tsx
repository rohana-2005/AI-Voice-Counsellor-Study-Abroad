'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthSession } from './AuthSessionProvider';

export default function AuthRouteWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, needsOnboarding, loading } = useAuthSession();

  const isHome = pathname === '/';
  const isOnboarding = pathname === '/onboarding';

  useEffect(() => {
    if (isHome || isOnboarding || loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (needsOnboarding && !isOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (!needsOnboarding && isOnboarding) {
      router.replace('/dashboard');
    }
  }, [isHome, isOnboarding, loading, isAuthenticated, needsOnboarding, router]);

  if (isHome || isOnboarding) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: '14px', color: '#64748b' }}>
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
