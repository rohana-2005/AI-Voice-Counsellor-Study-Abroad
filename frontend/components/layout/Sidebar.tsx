'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, User, MessageSquare, FileText,
  Settings, GraduationCap, LogOut, ChevronRight,
} from 'lucide-react';
import { student } from '@/lib/mockData';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

const navItems = [
  { label: 'Dashboard',   href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile',  href: '/dashboard#profile', icon: User },
  { label: 'Sessions',    href: '/session',   icon: MessageSquare },
  { label: 'Reports',     href: '/report',    icon: FileText },
  { label: 'Settings',    href: '/dashboard#settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuthSession();
  const displayName = profile?.full_name || student.full_name;
  const displayEmail = profile?.email || student.email;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US';

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
      {/* Logo */}
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
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>StudyAbroad</span>
          <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>.AI</span>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px' }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href.split('#')[0]));
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

      {/* Start Session CTA */}
      <div style={{ padding: '12px' }}>
        <Link href="/session" style={{ textDecoration: 'none' }}>
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
            <MessageSquare size={15} />
            Start AI Session
            <ChevronRight size={14} />
          </button>
        </Link>
      </div>

      {/* User profile */}
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
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
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
            }}
          >
            {displayEmail}
          </p>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
