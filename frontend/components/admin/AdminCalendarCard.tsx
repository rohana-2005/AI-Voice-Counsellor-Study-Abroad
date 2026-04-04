'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Video } from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

type CalendarEvent = {
  id: string;
  summary: string;
  timeLabel: string;
  dateLabel: string;
  link?: string;
};

const colorPalette = ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#0f766e'];

export default function AdminCalendarCard() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
    []
  );
  const { accessToken } = useAuthSession();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      if (!accessToken) {
        if (!cancelled) {
          setEvents([]);
        }
        return;
      }

      if (!cancelled) {
        setStatus('loading');
      }
      try {
        const url = `${backendBaseUrl}/api/v1/calendar/events`;
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.events)) {
          if (!cancelled) {
            setStatus('error');
            setEvents([]);
          }
          return;
        }

        const mapped: CalendarEvent[] = data.events.map(
          (item: { id?: string; summary?: string; start?: string; htmlLink?: string }, index: number) => {
            const start = item.start ? new Date(item.start) : new Date();
            const isValid = !Number.isNaN(start.getTime());
            return {
              id: item.id || `evt-${index}`,
              summary: item.summary || 'Untitled Meeting',
              dateLabel: isValid
                ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'TBD',
              timeLabel: isValid
                ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : 'TBD',
              link: item.htmlLink,
            };
          }
        );

        if (!cancelled) {
          setEvents(mapped);
          setStatus('idle');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setEvents([]);
        }
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [accessToken, backendBaseUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: '320px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center' }}>
            <Calendar size={18} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Upcoming Meetings</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Synced from Google Calendar</p>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>Calendar Linked</span>
      </div>

      {status === 'loading' && (
        <div style={{ fontSize: '12px', color: '#64748b' }}>Loading meetings...</div>
      )}

      {status !== 'loading' && events.length === 0 && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            No meetings yet. Once Google Calendar is connected, upcoming sessions will appear here.
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {events.map((event, index) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: `${colorPalette[index % colorPalette.length]}22`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Video size={16} color={colorPalette[index % colorPalette.length]} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{event.summary}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                    {event.dateLabel} · {event.timeLabel}
                  </p>
                </div>
              </div>

              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
