'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Video } from 'lucide-react';

const seedEvents = [
  { label: 'IELTS Preparation Session',     time: '3:00 PM',  date: 'Apr 8',  color: '#2563eb' },
  { label: 'SOP Review with Counselor',     time: '11:00 AM', date: 'Apr 12', color: '#7c3aed' },
  { label: 'University Shortlisting Call',  time: '4:30 PM',  date: 'Apr 18', color: '#16a34a' },
];

export default function CalendarCard() {
  const [accessToken, setAccessToken] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [authError, setAuthError] = useState('');

  const [subject, setSubject] = useState('Counselling Session');
  const [description, setDescription] = useState('Booked from StudyAbroad.AI dashboard');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');

  const [bookedCount, setBookedCount] = useState(0);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [calendarPreviewNonce, setCalendarPreviewNonce] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(seedEvents);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as { type?: string; accessToken?: string; error?: string };
      if (payload?.type === 'google-oauth-success' && payload.accessToken) {
        setAccessToken(payload.accessToken);
        setAuthStatus('connected');
        setAuthError('');
      }

      if (payload?.type === 'google-oauth-error') {
        setAuthStatus('error');
        setAuthError(payload.error || 'Authentication failed');
      }
    };

    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, []);

  const canSchedule = useMemo(
    () => Boolean(accessToken && subject.trim() && date && time && duration),
    [accessToken, subject, date, time, duration]
  );

  const connectCalendar = async () => {
    setAuthStatus('connecting');
    setAuthError('');

    try {
      const res = await fetch('/api/auth/google?mode=popup');
      const data = await res.json();

      popupRef.current = window.open(
        data.url,
        'google-calendar-auth',
        'width=500,height=700,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popupRef.current) {
        setAuthStatus('error');
        setAuthError('Popup blocked. Please allow popups and try again.');
      }
    } catch {
      setAuthStatus('error');
      setAuthError('Could not start Google authentication');
    }
  };

  const bookMeeting = async () => {
    const startLocal = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startLocal.getTime())) {
      setBookingMessage('Choose a valid date and time.');
      return;
    }

    const durationMinutes = Number(duration);
    const endLocal = new Date(startLocal.getTime() + durationMinutes * 60 * 1000);

    setIsBooking(true);
    setBookingMessage('');
    setBookingLink('');

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          subject,
          description,
          startTime: startLocal.toISOString(),
          endTime: endLocal.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBookingMessage(data.error || 'Could not schedule meeting.');
        return;
      }

      const displayDate = startLocal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const displayTime = startLocal.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      setUpcomingEvents((prev) => [
        {
          label: subject,
          date: displayDate,
          time: displayTime,
          color: '#2563eb',
        },
        ...prev,
      ]);

      setBookedCount((prev) => prev + 1);
      setBookingMessage('Meeting scheduled and pushed to Google Calendar.');
      setBookingLink(data.htmlLink || '');
      setCalendarPreviewNonce((prev) => prev + 1);
    } catch {
      setBookingMessage('Network error while scheduling meeting.');
    } finally {
      setIsBooking(false);
    }
  };

  const calendarEmbedUrl =
    'https://calendar.google.com/calendar/embed?src=ruchigadgil%40gmail.com&ctz=Asia%2FKolkata';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Your Schedule</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Upcoming sessions & deadlines</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {bookedCount > 0 ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 700, color: '#166534',
              background: '#ecfdf3', border: '1px solid #86efac', borderRadius: '999px',
              padding: '5px 10px',
            }}>
              <CheckCircle2 size={12} />
              {bookedCount} booked
            </span>
          ) : null}
          <button
            onClick={connectCalendar}
            disabled={authStatus === 'connecting'}
            style={{
              fontSize: '12px', fontWeight: 600, color: '#2563eb',
              background: '#eff6ff', border: 'none', borderRadius: '8px',
              padding: '6px 12px', cursor: authStatus === 'connecting' ? 'not-allowed' : 'pointer',
              opacity: authStatus === 'connecting' ? 0.75 : 1,
            }}
          >
            {authStatus === 'connecting' ? 'Connecting...' : accessToken ? 'Connected' : 'Connect Calendar'}
          </button>
        </div>
      </div>

      {/* Inline auth + scheduling */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #dbeafe',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '10px', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="#2563eb" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '1px' }}>Schedule with Google Calendar</p>
            <p style={{ fontSize: '11px', color: '#64748b' }}>No page redirect. Stay on dashboard and book inline.</p>
          </div>
        </div>

        {authError ? <p style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '8px' }}>{authError}</p> : null}

        <div style={{ display: 'grid', gap: '8px' }}>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Meeting subject"
            style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Meeting notes"
            rows={2}
            style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155', resize: 'vertical' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: '8px' }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }}
            />
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155', background: '#fff' }}
            >
              <option value="15">15m</option>
              <option value="30">30m</option>
              <option value="45">45m</option>
              <option value="60">60m</option>
            </select>
          </div>

          <button
            onClick={bookMeeting}
            disabled={!canSchedule || isBooking}
            style={{
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: !canSchedule || isBooking ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: !canSchedule || isBooking ? 'not-allowed' : 'pointer',
            }}
          >
            <Video size={14} />
            {isBooking ? 'Scheduling...' : 'Schedule Event'}
          </button>
        </div>

        {bookingMessage ? <p style={{ fontSize: '12px', color: '#334155', marginTop: '10px' }}>{bookingMessage}</p> : null}
        {bookingLink ? (
          <a href={bookingLink} target="_blank" rel="noreferrer" style={{ marginTop: '2px', fontSize: '12px', color: '#1d4ed8', textDecoration: 'none' }}>
            Open booked event in Google Calendar
          </a>
        ) : null}
      </div>

      {/* Calendar preview */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '14px',
        background: '#ffffff',
      }}>
        <iframe
          key={calendarPreviewNonce}
          src={calendarEmbedUrl}
          title="Google Calendar Preview"
          style={{ width: '100%', height: 260, border: 0, display: 'block' }}
          scrolling="no"
        />
      </div>

      {/* Event list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {upcomingEvents.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{ev.label}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <Clock size={11} color="#94a3b8" />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ev.date} · {ev.time}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
