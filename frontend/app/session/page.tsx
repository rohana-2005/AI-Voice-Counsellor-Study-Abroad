'use client';

import Avatar from '@/components/Avatar';

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
  return <Avatar />;
}
