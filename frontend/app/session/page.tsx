'use client';

import { useState } from 'react';
import Avatar from '@/components/Avatar';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';
import { GraduationCap, Mic, Phone } from 'lucide-react';

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
          background: '#f8fafc',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: '32px 28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
            }}
          >
            <GraduationCap style={{ width: 28, height: 28, color: '#ffffff' }} />
          </div>

          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 8,
              letterSpacing: '-0.3px',
            }}
          >
            Start Live Avatar Session
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            The Anam avatar is paused. Click below to start the live session
            when you are ready.
          </p>

          {/* Enable Avatar */}
          <button
            id="enable-avatar-btn"
            onClick={() => setIsAvatarEnabled(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '13px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              transition: 'opacity 0.15s',
            }}
          >
            <Mic style={{ width: 16, height: 16 }} />
            Enable Avatar
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '16px 0 14px',
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>

          {/* Connect via Call */}
          <button
            id="connect-via-call-btn"
            onClick={handleConnectViaCall}
            disabled={isCalling}
            style={{
              width: '100%',
              background: '#f8fafc',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isCalling ? 'not-allowed' : 'pointer',
              opacity: isCalling ? 0.65 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            <Phone style={{ width: 14, height: 14 }} />
            {isCalling ? 'Calling...' : 'Connect Via Call (No Avatar)'}
          </button>

          {/* Call message feedback */}
          {callMsg ? (
            <p
              style={{
                fontSize: 12,
                color: callMsg.startsWith('Call failed') ? '#dc2626' : '#15803d',
                background: callMsg.startsWith('Call failed') ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${callMsg.startsWith('Call failed') ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: 8,
                padding: '8px 12px',
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              {callMsg}
            </p>
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
