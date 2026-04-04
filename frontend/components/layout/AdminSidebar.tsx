'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Flame,
  CalendarClock,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

const navItems = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Universities', href: '/admin/dashboard#universities', icon: Building2 },
  { label: 'Priority Queue', href: '/admin/dashboard#priority', icon: Flame },
  { label: 'Calendar', href: '/admin/dashboard#calendar', icon: CalendarClock },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useAuthSession();
  const displayName = profile?.full_name || 'Admin User';
  const displayEmail = profile?.email || 'admin@studyabroad.ai';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  return (
    <aside
      style={{
        width: '256px',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '20px 20px',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <GraduationCap size={18} color="#ffffff" />
        </div>
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>Admin Console</span>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>StudyAbroad.AI</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px' }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href.split('#')[0]));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.12 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#475569',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 500, flex: 1 }}>
                  {item.label}
                </span>
                {isActive && (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                    }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
          >
            <LogOut size={15} />
            Student Dashboard
          </button>
        </Link>
      </div>

      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              fontSize: '11px',
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {displayEmail}
          </p>
        </div>
      </div>
    </aside>
  );
}
