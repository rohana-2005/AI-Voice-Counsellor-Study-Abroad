'use client';

import { useState } from 'react';
import Avatar from '@/components/Avatar';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

/**
 * Session Page
 *
 * The Avatar component is fully self-contained:
 *   - Fetches a session token from the FastAPI backend
 *   - Streams the Anam AI avatar to a video element
 *   - Shows a live real-time chat transcript using AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED
 *   - Saves the full transcript on "End Session"
 */
export default function SessionPage() {
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callMsg, setCallMsg] = useState<string | null>(null);
  const { profile } = useAuthSession();
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

  const handleConnectViaCall = async () => {
    if (!profile?.student_id && !profile?.phone_number) {
      setCallMsg('Complete onboarding phone number first, then retry.');
      return;
    }

    setIsCalling(true);
    setCallMsg(null);
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/calls/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: profile?.student_id || undefined,
          student_phone: profile?.phone_number || undefined,
          student_name: profile?.full_name || undefined,
          context: 'User initiated counseling call from session page before enabling avatar.',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; call_sid?: string };
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setCallMsg(data.call_sid ? `Call started (SID: ${data.call_sid})` : 'Call started.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCallMsg(`Call failed: ${message}`);
    } finally {
      setIsCalling(false);
    }
  };

  if (!isAvatarEnabled) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f172a',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '20px',
            padding: '28px',
            color: '#e2e8f0',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Start Live Avatar Session</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            The Anam avatar is paused. Click below to start the live session when you are ready.
          </p>
          <button
            onClick={() => setIsAvatarEnabled(true)}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Enable Avatar
          </button>
          <button
            onClick={handleConnectViaCall}
            disabled={isCalling}
            style={{
              marginTop: '10px',
              background: '#1f2937',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isCalling ? 'not-allowed' : 'pointer',
              width: '100%',
              opacity: isCalling ? 0.7 : 1,
            }}
          >
            {isCalling ? 'Calling...' : 'Connect Via Call (No Avatar)'}
          </button>
          {callMsg ? (
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>{callMsg}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Avatar
      studentId={profile?.student_id || undefined}
      studentPhone={profile?.phone_number || undefined}
      studentName={profile?.full_name || undefined}
    />
  );
}
