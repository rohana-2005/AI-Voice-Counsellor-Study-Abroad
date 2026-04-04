'use client';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar — fixed 256px */}
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <div style={{ marginLeft: '256px', flex: 1, minWidth: 0 }}>
        {/* Top navbar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px' }}>
            {/* Page title */}
            <div>
              {title && (
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {subtitle}
                </p>
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  width: '220px',
                }}
              >
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#334155',
                    width: '100%',
                  }}
                />
              </div>

              {/* Bell */}
              <button
                style={{
                  position: 'relative',
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Bell size={16} color="#64748b" />
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '1.5px solid white',
                  }}
                />
              </button>

              {/* Session CTA */}
              <Link href="/session">
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🎤 Start Session
                </button>
              </Link>

              {/* Avatar */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>AS</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
