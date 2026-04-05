'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, Star, Mic, Play,
  Shield, GraduationCap, TrendingUp, Zap, Target, Users,
} from 'lucide-react';
import { stats, countries, testimonials } from '@/lib/mockData';

/* ─── Reusable Section Header ─────────────────────── */
function SectionHeader({
  eyebrow, title, subtitle, inView,
}: { eyebrow: string; title: string; subtitle: string; inView: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '56px' }}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          color: '#2563eb',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '12px',
        }}
      >
        {eyebrow}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
        className="font-display"
        style={{
          fontSize: '38px',
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1.2,
          marginBottom: '16px',
        }}
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.2 }}
        style={{ fontSize: '17px', color: '#475569', maxWidth: '520px', margin: '0 auto' }}
      >
        {subtitle}
      </motion.p>
    </div>
  );
}

/* ─── Hero Right: AI Visual Panel ──────────────────── */
function HeroVisual() {
  const conversation = [
    { role: 'ai',   text: "What's your current education level?" },
    { role: 'user', text: "Bachelor's in Engineering" },
    { role: 'ai',   text: "Great choice! What's your target country?" },
  ];

  return (
    <div style={{ position: 'relative', height: '420px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* ── Main session card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          position: 'relative',
          width: '300px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          borderRadius: '22px',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 20px 60px rgba(37,99,235,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          padding: '20px',
          zIndex: 10,
        }}
      >
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>AI Counseling Session</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Live</span>
            </div>
          </div>
        </div>

        {/* Conversation bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {conversation.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'ai' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.18 }}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: msg.role === 'ai' ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                background: msg.role === 'ai'
                  ? '#f8fafc'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: msg.role === 'ai' ? '#334155' : '#fff',
                fontSize: '11.5px',
                fontWeight: 500,
                lineHeight: 1.5,
                border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
              }}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}
        >
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18 }}
                style={{ width: 4, height: 4, background: '#94a3b8', borderRadius: '50%', display: 'inline-block' }}
              />
            ))}
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>AI is thinking…</span>
        </motion.div>
      </motion.div>

      {/* ── Top-left floating: Lead Score ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
        transition={{ opacity: { delay: 0.7 }, scale: { delay: 0.7 }, y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } }}
        style={{
          position: 'absolute', top: '30px', left: '10px',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.9)',
          borderRadius: '14px',
          padding: '10px 14px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: '9px',
          zIndex: 20,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '9px',
          background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={14} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Lead Score</p>
          <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>82%</p>
        </div>
      </motion.div>

      {/* ── Top-right floating: Qualified Lead ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{ opacity: { delay: 0.85 }, scale: { delay: 0.85 }, y: { repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.5 } }}
        style={{
          position: 'absolute', top: '42px', right: '8px',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: '12px',
          padding: '9px 13px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: '7px',
          zIndex: 20,
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>Qualified Lead</span>
      </motion.div>

      {/* ── Bottom-left floating: Top Match ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{ opacity: { delay: 1 }, scale: { delay: 1 }, y: { repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 } }}
        style={{
          position: 'absolute', bottom: '38px', left: '8px',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.9)',
          borderRadius: '14px',
          padding: '10px 14px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: '9px',
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: '20px' }}>CA</span>
        <div>
          <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Top Match</p>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Canada</p>
        </div>
      </motion.div>

      {/* ── Bottom-right floating: Scholarship Eligible ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
        transition={{ opacity: { delay: 1.1 }, scale: { delay: 1.1 }, y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut', delay: 0.8 } }}
        style={{
          position: 'absolute', bottom: '44px', right: '4px',
          background: 'linear-gradient(135deg, #4f46e5, #2563eb)',
          borderRadius: '12px',
          padding: '9px 14px',
          boxShadow: '0 6px 18px rgba(79,70,229,0.35)',
          display: 'flex', alignItems: 'center', gap: '7px',
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: '13px' }}>SC</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>Scholarship Eligible</span>
      </motion.div>

      {/* ── Background blurred orbs ── */}
      <div style={{
        position: 'absolute', top: '10%', left: '8%',
        width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '8%', right: '5%',
        width: 150, height: 150,
        background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', filter: 'blur(20px)',
      }} />
    </div>
  );
}



/* ─── Hero ─────────────────────────────────────────── */
function Hero() {
  const problemSolutions = [
    { icon: Zap,    text: 'Instant AI voice counseling eliminates wait times & student drop-offs' },
    { icon: Target, text: 'Automates 60–70% of repetitive queries, freeing your counselors for high-value work' },
    { icon: Users,  text: 'Collects structured data to qualify high-intent leads intelligently' },
  ];

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f5f3ff 100%)',
        minHeight: '100vh',
        paddingTop: '80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background blurred gradient orbs */}
      <div style={{ position: 'absolute', top: -40, right: -60, width: 500, height: 500, background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -40, width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', top: '40%', left: '35%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(30px)' }} />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          alignItems: 'center',
          paddingTop: '40px',
          paddingBottom: '40px',
          width: '100%',
        }}
      >
        {/* ── LEFT: Primary Content ── */}
        <div>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(79,70,229,0.08))',
              border: '1px solid rgba(37,99,235,0.2)',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: '999px',
              marginBottom: '18px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ width: 7, height: 7, background: '#2563eb', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            AI Powered • Trusted by 45,000+ Students
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display"
            style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.1, color: '#0f172a', marginBottom: '14px' }}
          >
            Your{' '}
            <span style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              AI Study Abroad
            </span>
            <br />Counselor
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: '15px', color: '#475569', lineHeight: 1.65, marginBottom: '22px', maxWidth: '460px' }}
          >
            Automating student counseling with intelligent voice conversations — faster, smarter, and scalable.
          </motion.p>

          {/* Problem-Solution Points */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '26px' }}
          >
            {problemSolutions.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '8px',
                    background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    marginTop: '1px',
                  }}>
                    <Icon size={13} color="#2563eb" />
                  </div>
                  <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500, lineHeight: 1.6 }}>{item.text}</span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
          >
            <Link href="/onboarding" style={{ textDecoration: 'none' }}>
              <button
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(37,99,235,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.35)'; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#ffffff', fontWeight: 700,
                  padding: '15px 30px', borderRadius: '14px', border: 'none',
                  cursor: 'pointer', fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                  transition: 'all 0.22s ease',
                }}
              >
                <Mic size={16} />
                Start AI Consultation
                <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,0.85)', color: '#0f172a', fontWeight: 600,
                  padding: '15px 30px', borderRadius: '14px',
                  border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: '14px',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.22s ease',
                }}
              >
                <Play size={15} color="#2563eb" />
                See How It Works
              </button>
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{ display: 'flex' }}>
              {['P', 'R', 'A', 'K'].map((l, i) => (
                <div
                  key={i}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '2px solid #ffffff',
                    background: `hsl(${220 + i * 20}, 68%, 54%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    marginLeft: i > 0 ? '-8px' : 0,
                    zIndex: 4 - i,
                    position: 'relative',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>4.9/5 from 2,400+ students</p>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT: AI Visual Story ── */}
        <motion.div
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}


/* ─── Stats Bar ─────────────────────────────────────── */
function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '40px 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '24px',
          }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.07 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ──────────────────────────────────── */
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const steps = [
    { num: '01', emoji: 'VO', color: '#2563eb', bg: '#eff6ff', title: 'AI Voice Onboarding', desc: 'Have a natural conversation with our AI counselor. Share your background, goals, and budget in minutes.' },
    { num: '02', emoji: 'RS', color: '#7c3aed', bg: '#f5f3ff', title: 'Get Your Readiness Score', desc: 'Instantly receive a detailed readiness score with academic, financial, and clarity breakdowns.' },
    { num: '03', emoji: 'AP', color: '#0891b2', bg: '#ecfeff', title: 'Apply with Expert Support', desc: 'Get matched universities, scholarship opportunities, SOP guidance, and complete visa support.' },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      style={{ background: '#f8fafc', padding: '96px 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <SectionHeader
          eyebrow="Simple 3-Step Process"
          title="How It Works"
          subtitle="From conversation to offer letter — our AI handles everything intelligently."
          inView={inView}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', position: 'relative' }}>
          {/* Connector */}
          <div style={{ position: 'absolute', top: '68px', left: '33%', right: '33%', height: '1px', background: 'linear-gradient(90deg, #bfdbfe, #c4b5fd)' }} />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '36px 28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: step.color, color: '#fff',
                  fontWeight: 800, fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: `0 4px 12px ${step.color}40`,
                }}
              >
                {step.num}
              </div>
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: step.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', marginBottom: '16px',
                }}
              >
                {step.emoji}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>{step.title}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Countries ─────────────────────────────────────── */
function Countries() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const gradients = [
    'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #b91c1c, #ef4444)',
    'linear-gradient(135deg, #4338ca, #7c3aed)',
  ];

  return (
    <section id="countries" ref={ref} style={{ background: '#ffffff', padding: '96px 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <SectionHeader eyebrow="Global Destinations" title="Study in Top Destinations" subtitle="UK, Ireland, Canada & USA — we cover all major study abroad destinations." inView={inView} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {countries.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '20px', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              {/* Card header */}
              <div style={{ background: gradients[i], padding: '28px 24px 24px', position: 'relative', overflow: 'hidden' }}>
                <span style={{ fontSize: '36px', position: 'absolute', top: 12, right: 16, opacity: 0.25 }}>{c.flag}</span>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>{c.flag}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{c.name}</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{c.universities} Universities</p>
              </div>

              {/* Card body */}
              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Avg. Tuition</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{c.avgTuition}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Work Visa</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>{c.workVisa}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: 500, marginBottom: '12px' }}>{c.highlight}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {c.popularCourses.slice(0, 3).map(course => (
                    <div key={course} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{course}</span>
                    </div>
                  ))}
                </div>
                <Link href="/onboarding" style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', fontSize: '13px', fontWeight: 600,
                    color: '#2563eb', background: '#eff6ff',
                    border: 'none', borderRadius: '10px', padding: '10px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    Explore Universities →
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ──────────────────────────────────── */
function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="testimonials" ref={ref} style={{ background: '#f8fafc', padding: '96px 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <SectionHeader eyebrow="Student Success Stories" title="40,000+ Dreams Fulfilled" subtitle="Real students, real admissions. Your success story starts here." inView={inView} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 }}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '20px', padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                {[1,2,3,4,5].map(x => <Star key={x} size={15} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.7, marginBottom: '24px', fontStyle: 'italic' }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `hsl(${210 + i * 25}, 65%, 55%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0,
                  }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{t.course} · {t.year}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{t.flag} {t.university}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>{t.country}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #4338ca 100%)', padding: '96px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(219,234,254,0.9)', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '16px' }}>Your Dream Awaits</span>
          <h2 className="font-display" style={{ fontSize: '44px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', lineHeight: 1.2 }}>
            Start Your Study Abroad<br />Journey Today
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(219,234,254,0.85)', marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px' }}>
            Join 40,000+ students who&apos;ve used our AI counselor to get admitted to their dream universities.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#ffffff', color: '#2563eb',
                fontWeight: 700, padding: '16px 32px', borderRadius: '14px',
                border: 'none', cursor: 'pointer', fontSize: '15px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                <Mic size={18} />
                Start Free AI Consultation
                <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.12)', color: '#ffffff',
                fontWeight: 700, padding: '16px 32px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '15px',
              }}>
                View Dashboard
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: 'Destinations', links: ['United Kingdom', 'Ireland', 'Canada', 'United States'] },
    { title: 'Services', links: ['AI Counseling', 'University Shortlisting', 'SOP Assistance', 'Visa Guidance'] },
    { title: 'Company', links: ['About Us', 'Privacy Policy', 'Terms of Service', 'Contact'] },
  ];
  return (
    <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '64px 0 32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '40px', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={17} color="#fff" />
              </div>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px' }}>StudyAbroad<span style={{ color: '#60a5fa' }}>.AI</span></span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#475569' }}>AI-powered study abroad counseling platform trusted by 40,000+ students globally.</p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '12px', color: '#334155' }}>© 2026 StudyAbroad.AI. All rights reserved.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
            <Shield size={13} />
            <span>SSL Secured · GDPR Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Sticky CTA ─────────────────────────────────────── */
function StickyCTA() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2 }}
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50, display: 'none' }}
      className="block md:hidden"
    >
      <Link href="/onboarding" style={{ textDecoration: 'none' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#2563eb', color: '#ffffff', fontWeight: 700,
          padding: '14px 22px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '14px',
          boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
        }}>
          <Mic size={16} />
          Free Consultation
        </button>
      </Link>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Countries />
      <Testimonials />
      <FinalCTA />
      <Footer />
      <StickyCTA />
    </>
  );
}
