'use client';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, BookOpen, Globe2, Calendar, DollarSign, FlaskConical } from 'lucide-react';
import { student, academicProfile } from '@/lib/mockData';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

const infoRows = [
  { icon: BookOpen,    label: 'Education',  value: academicProfile.edu_level,       iconBg: '#eff6ff', iconColor: '#2563eb' },
  { icon: FlaskConical,label: 'Field',       value: academicProfile.current_field,   iconBg: '#f5f3ff', iconColor: '#7c3aed' },
  { icon: Globe2,      label: 'Course',      value: academicProfile.course_interest, iconBg: '#eef2ff', iconColor: '#4338ca' },
  { icon: DollarSign,  label: 'Budget',      value: academicProfile.budget_range,    iconBg: '#f0fdf4', iconColor: '#16a34a' },
  { icon: Calendar,    label: 'Intake',      value: academicProfile.intake_timing,   iconBg: '#fff7ed', iconColor: '#c2410c' },
  { icon: FlaskConical,label: 'CGPA',        value: academicProfile.gpa_percentage,  iconBg: '#eff6ff', iconColor: '#2563eb' },
];

export default function StudentSummary() {
  const { profile } = useAuthSession();
  const displayName = profile?.full_name || student.full_name;
  const displayEmail = profile?.email || student.email;
  const displayPhone = profile?.phone_number || student.phone_number;
  const displayLocation = profile?.location || student.location;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        height: '100%',
      }}
    >
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)', flexShrink: 0,
          }}>
            <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>{initials}</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{displayName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <MapPin size={12} color="#94a3b8" />
              <span style={{ fontSize: '12px', color: '#64748b' }}>{displayLocation}</span>
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: '#16a34a',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          padding: '4px 10px', borderRadius: '999px',
        }}>✓ Verified</span>
      </div>

      {/* Contact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {[
          { Icon: Mail,  val: displayEmail },
          { Icon: Phone, val: displayPhone },
        ].map(({ Icon, val }) => (
          <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} color="#2563eb" />
            </div>
            <span style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '20px' }} />

      {/* Academic info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        {infoRows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '8px', background: row.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <Icon size={13} color={row.iconColor} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 2px' }}>{row.label}</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target countries */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '8px' }}>Target Countries</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {academicProfile.target_countries.map(c => (
            <span key={c} style={{
              fontSize: '12px', fontWeight: 600, color: '#1d4ed8',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              padding: '4px 12px', borderRadius: '999px',
            }}>{c}</span>
          ))}
        </div>
      </div>

      {/* Test status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Test Status</span>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: '#b45309',
          background: '#fffbeb', border: '1px solid #fde68a',
          padding: '4px 10px', borderRadius: '999px',
        }}>{academicProfile.test_status}</span>
      </div>
    </motion.div>
  );
}
