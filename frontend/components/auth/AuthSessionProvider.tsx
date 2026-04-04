'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthProfile = {
  full_name?: string | null;
  email?: string | null;
  picture?: string | null;
  phone_number?: string | null;
  location?: string | null;
  student_id?: string | null;
  needs_onboarding?: boolean;
};

type AuthSessionContextValue = {
  accessToken: string;
  profile: AuthProfile | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'oauth_access_token';
const PROFILE_KEY = 'oauth_profile';

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState('');
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const backendBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_PY_BACKEND_URL ??
    'http://localhost:8000';

  const refreshProfile = useCallback(async () => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY) || '';
    if (!token) {
      setProfile(null);
      return;
    }

    try {
      const res = await fetch(
        `${backendBaseUrl}/api/v1/auth/google/profile?access_token=${encodeURIComponent(token)}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        return;
      }

      const profileData = (await res.json()) as AuthProfile;
      setProfile(profileData);
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
    } catch {
      // Backend may be temporarily unavailable during local dev; keep app usable.
      return;
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    const syncSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const queryToken = params.get('access_token');

        const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY) || '';
        const token = queryToken || storedToken;

        if (!token) {
          setLoading(false);
          return;
        }

        setAccessToken(token);
        window.localStorage.setItem(ACCESS_TOKEN_KEY, token);

        if (queryToken) {
          params.delete('access_token');
          const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
          window.history.replaceState({}, '', nextUrl);
        }

        const cachedProfile = window.localStorage.getItem(PROFILE_KEY);
        if (cachedProfile) {
          try {
            setProfile(JSON.parse(cachedProfile) as AuthProfile);
          } catch {
            // Ignore malformed local cache.
          }
        }

        await refreshProfile();
      } finally {
        setLoading(false);
      }
    };

    void syncSession();
  }, [backendBaseUrl, refreshProfile]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      accessToken,
      profile,
      isAuthenticated: Boolean(accessToken),
      needsOnboarding: Boolean(profile?.needs_onboarding),
      loading,
      refreshProfile,
    }),
    [accessToken, profile, loading, refreshProfile]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return context;
}
