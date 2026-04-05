'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Video, Sparkles, BookOpen, Target, FileText, Users } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type CalendarEvent = {
  id: string;
  label: string;
  time: string;
  date: string;
  color: string;
  link?: string;
};

type PlannedSession = {
  number: number;
  title: string;
  description: string;
  suggestedDate: string;
  suggestedTime: string;
  duration: number;
  iconKey: string;
  color: string;
  booked: boolean;
  eventLink?: string;
};

const colorPalette = ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#0f766e'];

const SESSION_TEMPLATES = [
  {
    number: 1,
    title: 'University Shortlist Review',
    description: 'Review your target universities, eligibility criteria, and ranking preferences.',
    suggestedTime: '10:00',
    duration: 45,
    iconKey: 'target',
    color: '#2563eb',
  },
  {
    number: 2,
    title: 'SOP & Essay Strategy',
    description: 'Plan your Statement of Purpose structure, themes, and personal narrative.',
    suggestedTime: '11:00',
    duration: 60,
    iconKey: 'file',
    color: '#7c3aed',
  },
  {
    number: 3,
    title: 'Document Checklist & LORs',
    description: 'Go through required documents, transcripts, and Letter of Recommendation strategy.',
    suggestedTime: '10:00',
    duration: 45,
    iconKey: 'book',
    color: '#16a34a',
  },
  {
    number: 4,
    title: 'Visa & Financial Planning',
    description: 'Discuss visa requirements, financial documentation, and scholarship options.',
    suggestedTime: '11:00',
    duration: 60,
    iconKey: 'users',
    color: '#ea580c',
  },
];

function SessionIcon({ iconKey, size = 14 }: { iconKey: string; size?: number }) {
  if (iconKey === 'target') return <Target size={size} />;
  if (iconKey === 'file') return <FileText size={size} />;
  if (iconKey === 'book') return <BookOpen size={size} />;
  return <Users size={size} />;
}

function getWeeklyDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  for (let i = 0; i < 4; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function CalendarCard() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );
  const backendOrigin = useMemo(() => {
    try { return new URL(backendBaseUrl).origin; } catch { return 'http://localhost:8000'; }
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

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendarNonce, setCalendarNonce] = useState(0);

  const weeklyDates = useMemo(() => getWeeklyDates(), []);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>(() =>
    SESSION_TEMPLATES.map((s, i) => ({
      ...s,
      suggestedDate: weeklyDates[i] ?? '',
      booked: false,
    }))
  );
  const [bookingSessionIdx, setBookingSessionIdx] = useState<number | null>(null);
  const [sessionErrors, setSessionErrors] = useState<Record<number, string>>({});

  // Fetch user email for dynamic iframe
  useEffect(() => {
    if (!accessToken) { setUserEmail(null); return; }
    fetch(`${backendBaseUrl}/api/v1/auth/google/profile?access_token=${encodeURIComponent(accessToken)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.email) setUserEmail(data.email); })
      .catch(() => {});
  }, [accessToken, backendBaseUrl]);

  const calendarEmbedUrl = useMemo(() => {
    if (!userEmail) return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return (
      `https://calendar.google.com/calendar/embed` +
      `?src=${encodeURIComponent(userEmail)}` +
      `&ctz=${encodeURIComponent(tz)}` +
      `&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0` +
      `&_=${calendarNonce}`
    );
  }, [userEmail, calendarNonce]);

  const loadEvents = useCallback(async (token = accessToken) => {
    if (!token) return;
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/calendar/events?access_token=${encodeURIComponent(token)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.events)) return;
      setUpcomingEvents(data.events.map(
        (item: { id?: string; summary?: string; start?: string; htmlLink?: string }, index: number) => {
          const start = item.start ? new Date(item.start) : new Date();
          const isValid = !Number.isNaN(start.getTime());
          return {
            id: item.id || `evt-${index}`,
            label: item.summary || 'Untitled Event',
            date: isValid ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
            time: isValid ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
            color: colorPalette[index % colorPalette.length],
            link: item.htmlLink,
          };
        }
      ));
    } catch {}
  }, [accessToken, backendBaseUrl]);

  useEffect(() => {
    if (!accessToken) { setUpcomingEvents([]); return; }
    void loadEvents(accessToken);
  }, [accessToken, backendOrigin, loadEvents]);

  const canSchedule = useMemo(
    () => Boolean(accessToken && subject.trim() && date && time && duration),
    [accessToken, subject, date, time, duration]
  );

  // Core POST /api/v1/book
  const doBook = async (opts: { subject: string; description: string; date: string; time: string; durationMin: number }) => {
    const startLocal = new Date(`${opts.date}T${opts.time}:00`);
    if (Number.isNaN(startLocal.getTime())) return { ok: false as const, error: 'Invalid date/time.' };
    const endLocal = new Date(startLocal.getTime() + opts.durationMin * 60 * 1000);

    const res = await fetch(`${backendBaseUrl}/api/v1/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        access_token: accessToken,
        subject: opts.subject,
        description: opts.description,
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
      }),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) return { ok: false as const, error: (data?.detail || data?.error || `HTTP ${res.status}`) as string };
    return { ok: true as const, htmlLink: data.htmlLink as string | undefined, eventId: data.eventId as string | undefined };
  };

  // Manual form booking
  const bookMeeting = async () => {
    setIsBooking(true);
    setBookingMessage('');
    setBookingLink('');
    try {
      const result = await doBook({ subject, description, date, time, durationMin: Number(duration) });
      if (!result.ok) { setBookingMessage(result.error || 'Could not schedule meeting.'); return; }
      const startLocal = new Date(`${date}T${time}:00`);
      setUpcomingEvents((prev) => [{
        id: result.eventId || `local-${Date.now()}`,
        label: subject,
        date: startLocal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: startLocal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        color: '#2563eb',
        link: result.htmlLink,
      }, ...prev]);
      setBookedCount((c) => c + 1);
      setBookingMessage('Meeting scheduled and pushed to Google Calendar.');
      setBookingLink(result.htmlLink || '');
      setCalendarNonce((n) => n + 1);
      void loadEvents();
    } catch (e) {
      setBookingMessage('Network error while scheduling.');
    } finally {
      setIsBooking(false);
    }
  };

  // Book a planned session
  const bookPlannedSession = async (idx: number) => {
    const session = plannedSessions[idx];
    if (!session || session.booked || !accessToken) return;
    setBookingSessionIdx(idx);
    setSessionErrors((e) => { const n = { ...e }; delete n[idx]; return n; });
    try {
      const result = await doBook({
        subject: `Session ${session.number}: ${session.title}`,
        description: session.description,
        date: session.suggestedDate,
        time: session.suggestedTime,
        durationMin: session.duration,
      });
      if (!result.ok) {
        setSessionErrors((e) => ({ ...e, [idx]: result.error || 'Booking failed.' }));
        return;
      }
      setPlannedSessions((prev) =>
        prev.map((s, i) => i === idx ? { ...s, booked: true, eventLink: result.htmlLink } : s)
      );
      setBookedCount((c) => c + 1);
      setCalendarNonce((n) => n + 1);
      void loadEvents();
    } catch {
      setSessionErrors((e) => ({ ...e, [idx]: 'Network error. Please try again.' }));
    } finally {
      setBookingSessionIdx(null);
    }
  };

  const updateSessionField = (idx: number, field: 'suggestedDate' | 'suggestedTime', value: string) => {
    setPlannedSessions((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          {bookedCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#166534', background: '#ecfdf3', border: '1px solid #86efac', borderRadius: '999px', padding: '5px 10px' }}>
              <CheckCircle2 size={12} /> {bookedCount} booked
            </span>
          )}
          <span style={{ fontSize: '12px', color: userEmail ? '#1d4ed8' : '#94a3b8', fontWeight: 600 }}>
            {userEmail ? 'Calendar Linked ✓' : accessToken ? 'Loading…' : 'Not connected'}
          </span>
        </div>
      </div>

      {/* Google Calendar iframe */}
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #dbeafe', background: '#f8fafc' }}>
        {calendarEmbedUrl ? (
          <iframe
            key={calendarNonce}
            src={calendarEmbedUrl}
            style={{ width: '100%', height: 380, border: 'none', display: 'block' }}
            title="Google Calendar"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div style={{ height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Calendar size={32} color="#93c5fd" />
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, margin: 0 }}>
              {accessToken ? 'Loading your calendar…' : 'Sign in with Google to see your calendar'}
            </p>
          </div>
        )}
      </div>

      {/* ── 4 Planned Sessions ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sparkles size={15} color="#7c3aed" />
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Your Study Abroad Roadmap</p>
          <span style={{ fontSize: '11px', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '999px', padding: '2px 8px', fontWeight: 600 }}>
            4 sessions planned
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plannedSessions.map((session, idx) => (
            <div
              key={session.number}
              style={{
                background: session.booked ? '#f0fdf4' : '#fafafa',
                border: `1px solid ${session.booked ? '#86efac' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '14px 16px',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: session.booked ? 0 : '12px' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: session.booked ? '#dcfce7' : `${session.color}15`,
                  border: `2px solid ${session.booked ? '#4ade80' : session.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: session.booked ? '#16a34a' : session.color,
                }}>
                  {session.booked
                    ? <CheckCircle2 size={15} />
                    : <SessionIcon iconKey={session.iconKey} size={14} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                      Session {session.number}: {session.title}
                    </span>
                    <span style={{ fontSize: '10px', color: session.color, background: `${session.color}12`, border: `1px solid ${session.color}25`, borderRadius: '999px', padding: '1px 7px', fontWeight: 600 }}>
                      {session.duration}min
                    </span>
                    {session.booked && (
                      <span style={{ fontSize: '10px', color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '999px', padding: '1px 7px', fontWeight: 600 }}>
                        ✓ Booked
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>{session.description}</p>
                  {session.booked && session.eventLink && (
                    <a href={session.eventLink} target="_blank" rel="noreferrer"
                      style={{ fontSize: '11px', color: '#1d4ed8', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>
                      Open in Google Calendar →
                    </a>
                  )}
                </div>
              </div>

              {/* Date/time + book — only when not booked */}
              {!session.booked && (
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="date" value={session.suggestedDate}
                      onChange={(e) => updateSessionField(idx, 'suggestedDate', e.target.value)}
                      style={{ flex: '1 1 120px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '7px 10px', fontSize: '12px', color: '#334155' }} />
                    <input type="time" value={session.suggestedTime}
                      onChange={(e) => updateSessionField(idx, 'suggestedTime', e.target.value)}
                      style={{ flex: '1 1 90px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '7px 10px', fontSize: '12px', color: '#334155' }} />
                    <button
                      onClick={() => bookPlannedSession(idx)}
                      disabled={!accessToken || bookingSessionIdx === idx || !session.suggestedDate || !session.suggestedTime}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: (!accessToken || !session.suggestedDate || !session.suggestedTime) ? '#e2e8f0' : session.color,
                        color: (!accessToken || !session.suggestedDate || !session.suggestedTime) ? '#94a3b8' : '#fff',
                        fontSize: '12px', fontWeight: 600,
                        padding: '8px 14px', borderRadius: '8px', border: 'none',
                        cursor: (!accessToken || bookingSessionIdx === idx || !session.suggestedDate || !session.suggestedTime) ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {bookingSessionIdx === idx ? (
                        <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Booking…</>
                      ) : (
                        <><Video size={12} /> Book Session</>
                      )}
                    </button>
                  </div>
                  {sessionErrors[idx] && (
                    <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '6px', marginBottom: 0 }}>{sessionErrors[idx]}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manual booking form */}
      <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '14px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '10px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="#2563eb" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: 0 }}>Book a Custom Session</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Add any event directly to Google Calendar</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Meeting subject"
            style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Meeting notes" rows={2}
            style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '8px' }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155' }} />
            <select value={duration} onChange={(e) => setDuration(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #cbd5e1', padding: '9px 10px', fontSize: '12px', color: '#334155', background: '#fff' }}>
              <option value="15">15m</option>
              <option value="30">30m</option>
              <option value="45">45m</option>
              <option value="60">60m</option>
            </select>
          </div>
          <button onClick={bookMeeting} disabled={!canSchedule || isBooking}
            style={{ marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: !canSchedule || isBooking ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '9px 12px', borderRadius: '10px', border: 'none', cursor: !canSchedule || isBooking ? 'not-allowed' : 'pointer' }}>
            <Video size={14} />
            {isBooking ? 'Scheduling…' : 'Schedule Event'}
          </button>
        </div>

        {bookingMessage && (
          <p style={{ fontSize: '12px', color: bookingMessage.includes('scheduled') ? '#166534' : '#dc2626', marginTop: '10px', fontWeight: 500, margin: '10px 0 0' }}>
            {bookingMessage}
          </p>
        )}
        {bookingLink && (
          <a href={bookingLink} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1d4ed8', textDecoration: 'none', display: 'block', marginTop: '4px' }}>
            Open in Google Calendar →
          </a>
        )}
      </div>

      {/* Live events from API */}
      {upcomingEvents.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            From Your Calendar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {upcomingEvents.map((ev) => (
              <div key={ev.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', transition: 'background 0.12s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {ev.link ? <a href={ev.link} target="_blank" rel="noreferrer" style={{ color: '#334155', textDecoration: 'none' }}>{ev.label}</a> : ev.label}
                </p>
                <Clock size={10} color="#94a3b8" />
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ev.date} · {ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}