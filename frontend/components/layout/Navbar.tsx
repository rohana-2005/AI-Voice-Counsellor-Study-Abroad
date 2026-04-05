'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const navLinks = [
  { label: 'Home',         href: '/' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Countries',    href: '/#countries' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const backendBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_PY_BACKEND_URL ??
    'http://localhost:8000';

  const handleSignIn = async () => {
    if (isSigningIn) {
      return;
    }

    setSignInError('');
    setIsSigningIn(true);
    try {
      const res = await fetch(
        `${backendBaseUrl}/api/v1/auth/google?mode=redirect&origin=${encodeURIComponent(window.location.origin)}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        setSignInError(detail || 'Sign-in failed. Backend is unreachable or returned an error.');
        setIsSigningIn(false);
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setSignInError('Sign-in URL was not returned by backend.');
        setIsSigningIn(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setSignInError('Cannot reach backend at http://localhost:8000. Start backend and try again.');
      setIsSigningIn(false);
    }
  };

  const handleAdmin = async () => {
    if (isSigningIn) {
      return;
    }

    setSignInError('');
    setIsSigningIn(true);
    try {
      const res = await fetch(
        `${backendBaseUrl}/api/v1/admin/auth/google?mode=redirect&origin=${encodeURIComponent(window.location.origin)}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        setSignInError(detail || 'Admin sign-in failed. Backend is unreachable or returned an error.');
        setIsSigningIn(false);
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setSignInError('Admin sign-in URL was not returned by backend.');
        setIsSigningIn(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setSignInError('Cannot reach backend at http://localhost:8000. Start backend and try again.');
      setIsSigningIn(false);
    }
  };

  // Hide on app pages
  if (
    
    pathname?.startsWith('/dashboard') ||
   
    pathname?.startsWith('/session') ||
   
    pathname?.startsWith('/report') ||
    pathname?.startsWith('/admin')
   ||
    pathname?.startsWith('/onboarding')
  ) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={19} color="#ffffff" />
            </div>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>
              StudyAbroad<span style={{ color: '#2563eb' }}>.AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#475569',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleAdmin}
              disabled={isSigningIn}
              style={{
                fontSize: '14px', fontWeight: 600, color: '#1d4ed8',
                background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)',
                cursor: isSigningIn ? 'not-allowed' : 'pointer',
                padding: '8px 14px', borderRadius: '10px',
                opacity: isSigningIn ? 0.7 : 1,
              }}
            >
              Admin
            </button>
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              style={{
                fontSize: '14px', fontWeight: 500, color: '#334155',
                background: 'none', border: 'none', cursor: isSigningIn ? 'not-allowed' : 'pointer',
                padding: '8px 14px', borderRadius: '10px',
                opacity: isSigningIn ? 0.7 : 1,
              }}
            >
              {isSigningIn ? 'Redirecting...' : 'Sign In'}
            </button>
            <Link href="/onboarding" style={{ textDecoration: 'none' }}>
              <button
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                style={{
                  fontSize: '14px', fontWeight: 600, color: '#ffffff',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  border: 'none', cursor: 'pointer',
                  padding: '10px 20px', borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  transition: 'all 0.2s ease',
                }}>
                Start Free Consultation
              </button>
            </Link>
          </div>
        </div>
        {signInError ? (
          <div
            style={{
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {signInError}
          </div>
        ) : null}
      </div>
    </motion.nav>
  );
}
