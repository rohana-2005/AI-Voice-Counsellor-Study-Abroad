'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const { accessToken, profile, refreshProfile } = useAuthSession();
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(
    profile?.phone_number?.startsWith('pending-') ? '' : (profile?.phone_number || '')
  );
  const [location, setLocation] = useState(profile?.location || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = Boolean(accessToken && fullName.trim() && phoneNumber.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Name and phone number are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${backendBaseUrl}/api/v1/students/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          access_token: accessToken,
          full_name: fullName,
          phone_number: phoneNumber,
          location,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Failed to save profile details.');
        return;
      }

      await refreshProfile();
      router.replace('/dashboard');
    } catch {
      setError('Network error while saving profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '560px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Complete Your Profile</h1>
        <p style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
          First login detected. Please provide required details for your student profile.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '18px', display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Full Name *</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Phone Number *</span>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91XXXXXXXXXX"
              style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' }}
            />
          </label>

          {error ? <p style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit || saving}
            style={{
              marginTop: '6px',
              border: 'none',
              borderRadius: '10px',
              padding: '11px 14px',
              background: !canSubmit || saving ? '#93c5fd' : '#2563eb',
              color: '#fff',
              fontWeight: 700,
              cursor: !canSubmit || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
