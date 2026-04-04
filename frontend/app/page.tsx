'use client';
import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, Star, Mic, Play,
  Shield, GraduationCap, Phone, Mail, MapPin, Users,
  TrendingUp,
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

/* ─── Hero ─────────────────────────────────────────── */
function Hero() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '' });
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  const fields = [
    { key: 'name',  label: 'Full Name',     icon: Users,  placeholder: 'Enter your full name',      type: 'text'  },
    { key: 'email', label: 'Email Address',  icon: Mail,   placeholder: 'your@email.com',            type: 'email' },
    { key: 'phone', label: 'Phone Number',   icon: Phone,  placeholder: '+91 98765 43210',           type: 'tel'   },
    { key: 'city',  label: 'City',           icon: MapPin, placeholder: 'Mumbai, Delhi, Bangalore…', type: 'text'  },
  ];

  return (
    <section
      className="gradient-hero-bg"
      style={{ minHeight: '100vh', paddingTop: '80px', paddingBottom: '60px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Blobs */}
      <div style={{ position: 'absolute', top: 80, right: 0, width: 400, height: 400, background: 'radial-gradient(circle, rgba(219,234,254,0.7) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 300, height: 300, background: 'radial-gradient(circle, rgba(239,246,255,0.8) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '56px',
          alignItems: 'center',
          minHeight: 'calc(100vh - 80px)',
        }}
      >
        {/* ── Left copy ── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '999px',
              marginBottom: '24px',
            }}
          >
            <span style={{ width: 7, height: 7, background: '#2563eb', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            🤖 AI-Powered · Trusted by 40,000+ Students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display"
            style={{ fontSize: '58px', fontWeight: 800, lineHeight: 1.1, color: '#0f172a', marginBottom: '20px' }}
          >
            Your AI{' '}
            <span className="gradient-text">Study Abroad</span>
            <br />Counselor
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: '17px', color: '#475569', lineHeight: 1.7, marginBottom: '32px', maxWidth: '480px' }}
          >
            Get personalized university recommendations, readiness scores, and expert
            guidance — all powered by AI. Free, instant, and available 24/7.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}
          >
            {[
              'Personalized university shortlisting in minutes',
              'AI readiness score & scholarship matching',
              'Voice-first counseling experience',
              'End-to-end application & visa support',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={13} color="#2563eb" />
                </div>
                <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
          >
            <Link href="/onboarding" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#2563eb', color: '#ffffff', fontWeight: 600,
                  padding: '14px 28px', borderRadius: '14px', border: 'none',
                  cursor: 'pointer', fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                  transition: 'background 0.15s',
                }}
              >
                <Mic size={16} />
                Start Free Consultation
                <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#ffffff', color: '#0f172a', fontWeight: 600,
                  padding: '14px 28px', borderRadius: '14px',
                  border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px',
                  transition: 'border-color 0.15s',
                }}
              >
                <Play size={15} color="#2563eb" />
                View Dashboard Demo
              </button>
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '14px' }}
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

        {/* ── Right form ── */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 24px 64px rgba(37,99,235,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '32px 0' }}
            >
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Application Received! 🎉</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Your AI counselor is ready. Start your free consultation now.</p>
              <Link href="/onboarding" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#2563eb', color: '#fff', fontWeight: 600, padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  Start AI Onboarding →
                </button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={15} color="#ffffff" />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Free Consultation</span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Get Your Study Abroad Plan
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b' }}>AI-matched universities + scholarship opportunities</p>
              </div>

              <form onSubmit={handleSubmit}>
                {fields.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.key} style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        {f.label}
                      </label>
                      {/* Flex-based input row — no absolute positioning */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '11px 14px',
                          background: '#ffffff',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <Icon size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          value={form[f.key as keyof typeof form]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          required
                          style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            color: '#0f172a',
                            background: 'transparent',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '8px',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  }}
                >
                  Get Free AI Consultation
                  <ArrowRight size={15} />
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>
                🔒 100% free · No spam · Your data is secure
              </p>

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['🇬🇧 UK', '🇮🇪 Ireland', '🇨🇦 Canada', '🇺🇸 USA'].map(c => (
                  <span
                    key={c}
                    style={{
                      fontSize: '12px', fontWeight: 500, color: '#475569',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      padding: '4px 12px', borderRadius: '999px',
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
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
    { num: '01', emoji: '🎙️', color: '#2563eb', bg: '#eff6ff', title: 'AI Voice Onboarding', desc: 'Have a natural conversation with our AI counselor. Share your background, goals, and budget in minutes.' },
    { num: '02', emoji: '📊', color: '#7c3aed', bg: '#f5f3ff', title: 'Get Your Readiness Score', desc: 'Instantly receive a detailed readiness score with academic, financial, and clarity breakdowns.' },
    { num: '03', emoji: '🎓', color: '#0891b2', bg: '#ecfeff', title: 'Apply with Expert Support', desc: 'Get matched universities, scholarship opportunities, SOP guidance, and complete visa support.' },
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
            Join 40,000+ students who've used our AI counselor to get admitted to their dream universities.
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
