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
  const { profile } = useAuthSession();

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
        </div>
      </div>
    );
  }

  return <Avatar studentId={profile?.student_id || undefined} />;
}
