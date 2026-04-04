'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Video } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type CalendarEvent = {
  id: string;
  label: string;
  time: string;
  date: string;
  color: string;
  link?: string;
};

const colorPalette = ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#0f766e'];

export default function CalendarCard() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );
  const backendOrigin = useMemo(() => {
    try {
      return new URL(backendBaseUrl).origin;
    } catch {
      return 'http://localhost:8000';
    }
  }, [backendBaseUrl]);

  const { accessToken } = useAuthSession();

  const [subject, setSubject] = useState('Counselling Session');
  const [description, setDescription] = useState('Booked from StudyAbroad.AI dashboard');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');

  const [bookedCount, setBookedCount] = useState(0);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = useCallback(
    async (token = accessToken) => {
      if (!token) {
        return;
      }

      try {
        const url = `${backendBaseUrl}/api/v1/calendar/events?access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.events)) {
          return;
        }
        const mapped: CalendarEvent[] = data.events.map(
          (item: { id?: string; summary?: string; start?: string; htmlLink?: string }, index: number) => {
            const start = item.start ? new Date(item.start) : new Date();
            const isValid = !Number.isNaN(start.getTime());
            return {
              id: item.id || `evt-${index}`,
              label: item.summary || 'Untitled Event',
              date: isValid
                ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'TBD',
              time: isValid
                ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : 'TBD',
              color: colorPalette[index % colorPalette.length],
              link: item.htmlLink,
            };
          }
        );

        setUpcomingEvents(mapped);
      } catch {
        // Keep UI responsive even if events fetch fails.
      }
    },
    [accessToken, backendBaseUrl]
  );

  useEffect(() => {
    if (!accessToken) {
      setUpcomingEvents([]);
      return;
    }

    void loadEvents(accessToken);
  }, [accessToken, backendOrigin, loadEvents]);

  const canSchedule = useMemo(
    () => Boolean(accessToken && subject.trim() && date && time && duration),
    [accessToken, subject, date, time, duration]
  );

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
      const res = await fetch(`${backendBaseUrl}/api/v1/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
          id: data.eventId || `local-${Date.now()}`,
          label: subject,
          date: displayDate,
          time: displayTime,
          color: '#2563eb',
          link: data.htmlLink || undefined,
        },
        ...prev,
      ]);

      setBookedCount((prev) => prev + 1);
      setBookingMessage('Meeting scheduled and pushed to Google Calendar.');
      setBookingLink(data.htmlLink || '');
      void loadEvents();
    } catch {
      setBookingMessage('Network error while scheduling meeting.');
    } finally {
      setIsBooking(false);
    }
  };

  const bookGeneratedEvents = async () => {
    const rawEvents = localStorage.getItem('onboardingEvents');
    if (!rawEvents || !accessToken) return;

    try {
      const generatedEvents = JSON.parse(rawEvents);
      if (!Array.isArray(generatedEvents) || generatedEvents.length === 0) return;

      setIsBooking(true);
      setBookingMessage('Syncing auto-generated schedule to your calendar...');

      let syncedCount = 0;

      for (const ev of generatedEvents) {
        const startLocal = new Date(`${ev.date}T${ev.time}:00`);
        const endLocal = new Date(startLocal.getTime() + ev.duration * 60 * 1000);

        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            subject: ev.label,
            description: 'AI Counselor Auto-Generated Milestone',
            startTime: startLocal.toISOString(),
            endTime: endLocal.toISOString(),
          }),
        });

        if (res.ok) {
          syncedCount++;
          const displayDate = startLocal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const displayTime = startLocal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

          setUpcomingEvents((prev) => [
            {
              label: ev.label,
              date: displayDate,
              time: displayTime,
              color: ev.color || '#2563eb',
            },
            ...prev,
          ]);
        }
      }

      setBookedCount((prev) => prev + syncedCount);
      setBookingMessage(`Successfully synced ${syncedCount} AI milestones to your calendar!`);
      localStorage.removeItem('onboardingEvents'); // clear them after syncing
      setCalendarPreviewNonce((prev) => prev + 1);

    } catch (e) {
      console.error(e);
      setBookingMessage('Failed to sync auto-generated events.');
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
            <span style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
              Calendar Linked
            </span>
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

        <div style={{ display: 'grid', gap: '8px' }}>
          
          {typeof window !== 'undefined' && localStorage.getItem('onboardingEvents') && (
            <button
               onClick={bookGeneratedEvents}
               disabled={!accessToken || isBooking}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 background: !accessToken || isBooking ? '#fcd34d' : '#3b82f6',
                 color: '#ffffff',
                 fontSize: '13px',
                 fontWeight: 600,
                 padding: '10px 14px',
                 borderRadius: '10px',
                 border: 'none',
                 cursor: !accessToken || isBooking ? 'not-allowed' : 'pointer',
                 marginBottom: '10px'
               }}
            >
               <CheckCircle2 size={16} />
               {isBooking ? 'Syncing...' : 'Sync AI Milestones to Calendar'}
            </button>
          )}

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

      {/* Event list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {upcomingEvents.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', padding: '8px 4px' }}>
            No upcoming events found on your calendar.
          </div>
        ) : null}
        {upcomingEvents.map((ev) => (
          <div key={ev.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {ev.link ? (
                  <a href={ev.link} target="_blank" rel="noreferrer" style={{ color: '#334155', textDecoration: 'none' }}>
                    {ev.label}
                  </a>
                ) : (
                  ev.label
                )}
              </p>
            </div>
            <Clock size={11} color="#94a3b8" />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ev.date} · {ev.time}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
