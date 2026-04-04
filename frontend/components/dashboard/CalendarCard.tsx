'use client';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video } from 'lucide-react';

const upcomingEvents = [
  { label: 'IELTS Preparation Session',     time: '3:00 PM',  date: 'Apr 8',  color: '#2563eb' },
  { label: 'SOP Review with Counselor',     time: '11:00 AM', date: 'Apr 12', color: '#7c3aed' },
  { label: 'University Shortlisting Call',  time: '4:30 PM',  date: 'Apr 18', color: '#16a34a' },
];

export default function CalendarCard() {
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
        <button style={{
          fontSize: '12px', fontWeight: 600, color: '#2563eb',
          background: '#eff6ff', border: 'none', borderRadius: '8px',
          padding: '6px 12px', cursor: 'pointer',
        }}>
          + Schedule
        </button>
      </div>

      {/* Calendar placeholder */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc, #eff6ff)',
        border: '2px dashed #bfdbfe',
        borderRadius: '14px',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mock month grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#334155', padding: '2px' }}>{d}</div>
          ))}
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: '10px', padding: '3px', borderRadius: '5px',
              background: i === 7 ? '#2563eb' : i === 11 || i === 17 ? '#bfdbfe' : 'transparent',
              color: i === 7 ? '#fff' : '#334155',
              fontWeight: i === 7 ? 700 : 400,
            }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: '14px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Calendar size={22} color="#2563eb" />
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Google Calendar Integration</p>
          <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>Google Calendar integration will appear here.<br />Sync sessions, deadlines & exams.</p>
          <button style={{
            marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px',
            background: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 600,
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            margin: '14px auto 0',
          }}>
            <Video size={13} />
            Connect Calendar
          </button>
        </div>
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
