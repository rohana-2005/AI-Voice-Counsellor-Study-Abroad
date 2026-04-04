'use client';

import { Bell, Search } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminDashboardLayout({ children, title, subtitle }: AdminDashboardLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AdminSidebar />

      <div style={{ marginLeft: '256px', flex: 1, minWidth: 0 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  width: '220px',
                }}
              >
                <Search size={15} color="#2563eb" />
                <input
                  type="text"
                  placeholder="Search admin..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#1d4ed8',
                    width: '100%',
                  }}
                />
              </div>

              <button
                style={{
                  position: 'relative',
                  padding: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Bell size={16} color="#2563eb" />
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#2563eb',
                    borderRadius: '50%',
                    border: '1.5px solid white',
                  }}
                />
              </button>
            </div>
          </div>
        </header>

        <main style={{ padding: '32px' }}>{children}</main>
      </div>
    </div>
  );
}
