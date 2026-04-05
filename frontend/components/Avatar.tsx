'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  PhoneOff,
  GraduationCap,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import { createClient, AnamEvent, MessageRole } from '@anam-ai/js-sdk';
import type { MessageStreamEvent, AnamClient } from '@anam-ai/js-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'ended';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;

  // Some SDKs throw custom objects where message is nested or non-enumerable.
  const stringified = String(err);
  if (stringified && stringified !== '[object Object]') return stringified;

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    const direct = obj.message;
    if (typeof direct === 'string' && direct.trim()) return direct;

    const name = obj.name;
    const reason = obj.reason;
    const error = obj.error;
    if (typeof reason === 'string' && reason.trim()) return reason;
    if (typeof error === 'string' && error.trim()) return error;
    if (typeof name === 'string' && name.trim() && typeof direct === 'string' && direct.trim()) {
      return `${name}: ${direct}`;
    }

    const detail = obj.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (typeof detail === 'object' && detail !== null) {
      const nested = detail as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
      if (typeof nested.body === 'string' && nested.body.trim()) return nested.body;
    }

    const cause = obj.cause;
    if (typeof cause === 'string' && cause.trim()) return cause;
    if (typeof cause === 'object' && cause !== null) {
      const nestedCause = cause as Record<string, unknown>;
      if (typeof nestedCause.message === 'string' && nestedCause.message.trim()) {
        return nestedCause.message;
      }
    }

    try {
      const json = JSON.stringify(obj);
      if (json && json !== '{}') return json;
    } catch {
      // ignore
    }
  }

  return 'Unknown error when starting session';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Avatar({ studentId, studentPhone, studentName }: { studentId?: string; studentPhone?: string; studentName?: string }) {
  // Session state
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  // Transcript (string that accumulates over the session)
  const transcriptRef = useRef<string>('');

  // In-flight streaming accumulator for each utterance:
  // key = message event id, value = accumulated text so far
  const streamBufferRef = useRef<Record<string, string>>({});

  // Refs
  const clientRef = useRef<AnamClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const isStartingRef = useRef(false);
  const hasAutoStartedRef = useRef(false);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Start session ──────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    if (status !== 'idle' || isStartingRef.current) return;
    isStartingRef.current = true;
    setStatus('connecting');
    setErrorMsg(null);
    setSavedSessionId(null);
    setSaveErrorMsg(null);

    try {
      const res = await fetch('http://localhost:8000/anam/session', { method: 'POST' });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      if (!res.ok) {
        const detail = data?.detail as unknown;
        const detailObj = typeof detail === 'object' && detail !== null ? (detail as Record<string, unknown>) : null;
        let errMsg = detailObj?.message as string ?? '';
        if (detailObj?.body) {
          errMsg += ` | ${detailObj.body}`;
        }
        
        throw new Error(
          errMsg ||
          (typeof detail === 'string' ? detail : undefined) ||
          `HTTP ${res.status}`
        );
      }

      const token =
        (typeof data.session_token === 'string' ? data.session_token : undefined) ??
        (typeof data.sessionToken === 'string' ? data.sessionToken : undefined);
      if (!token) throw new Error('Missing session_token in backend response');

      // Create client — store in ref so we never recreate it
      const client = createClient(token);
      clientRef.current = client;

      // ── Bind streaming event BEFORE calling streamToVideoElement so we
      //    capture events from the very first frame ──────────────────────────
      const onMessageStream = (event: MessageStreamEvent) => {
        const text = event.content;
        if (!text) return;

        const role: 'user' | 'ai' =
          event.role === MessageRole.PERSONA ? 'ai' : 'user';

        // Accumulate text into our buffer keyed by the event id
        const prev = streamBufferRef.current[event.id] ?? '';
        const accumulated = prev + text;
        streamBufferRef.current[event.id] = accumulated;

        if (event.endOfSpeech || event.interrupted) {
          // Utterance is complete — push final message into UI state
          const finalText = accumulated;
          const prefix = role === 'ai' ? '[AI]' : '[USER]';
          transcriptRef.current += `${prefix}: ${finalText}\n`;

          // Remove the streaming bubble and push final one
          setMessages((prev) => {
            // Drop any existing streaming bubble for this id
            const filtered = prev.filter((m) => m.id !== event.id);
            return [
              ...filtered,
              {
                id: event.id,
                role,
                text: finalText,
                timestamp: getTimestamp(),
                isStreaming: false,
              },
            ];
          });

          // Clean up buffer
          delete streamBufferRef.current[event.id];
        } else {
          // Still streaming — update or insert a live "typing" bubble
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === event.id);
            if (existing) {
              return prev.map((m) =>
                m.id === event.id ? { ...m, text: accumulated } : m
              );
            }
            return [
              ...prev,
              {
                id: event.id,
                role,
                text: accumulated,
                timestamp: getTimestamp(),
                isStreaming: true,
              },
            ];
          });
        }
      };

      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onMessageStream);

      // Stream avatar to the video element (takes the element ID string)
      await client.streamToVideoElement('anam-video-element');

      setStatus('connected');
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error('[Avatar] Session start failed:', message, err);
      setErrorMsg(message);
      setStatus('error');
    } finally {
      isStartingRef.current = false;
    }
  }, [status]);

  // Auto-start on mount
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    startSession();
    // We only want to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const client = clientRef.current;
      if (client) {
        // Remove all listeners to avoid callbacks firing after unmount
        // The SDK's removeListener requires the same function reference,
        // but since we define onMessageStream inside startSession we can't
        // cleanly reference it here. Calling stopStreaming tears down the
        // WebRTC connection which prevents any further events.
        client.stopStreaming().catch(() => {/* silently ignore */});
      }
    };
  }, []);

  // ─── Mute / unmute ──────────────────────────────────────────────────────────

  const handleMuteToggle = () => {
    const client = clientRef.current;
    if (!client) return;
    if (isMuted) {
      client.unmuteInputAudio();
    } else {
      client.muteInputAudio();
    }
    setIsMuted((prev) => !prev);
  };

  // ─── Send text message ───────────────────────────────────────────────────────

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || status !== 'connected') return;

    const client = clientRef.current;
    if (!client) return;

    // Immediately show user message in UI
    const msgId = generateId();
    const userMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      text: trimmed,
      timestamp: getTimestamp(),
      isStreaming: false,
    };
    setMessages((prev) => [...prev, userMsg]);
    transcriptRef.current += `[USER]: ${trimmed}\n`;

    // Send to Anam (SDK handles speech + response)
    client.sendUserMessage(trimmed);

    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── End session & save transcript ──────────────────────────────────────────

  const handleEndSession = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setStatus('ended');

    const client = clientRef.current;
    if (client) {
      try {
        await client.stopStreaming();
      } catch {/* ignore */}
    }

    // Build the transcript from the live UI messages directly,
    // ensuring we capture partially streamed sentences that haven't triggered endOfSpeech yet.
    const finalTranscript = messages
      .map((m) => `[${m.role === 'ai' ? 'AI' : 'USER'}]: ${m.text}`)
      .join('\n');

    try {
      const res = await fetch('http://localhost:8000/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTranscript || transcriptRef.current,
          student_id: studentId,
          student_phone: studentPhone,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        detail?: unknown;
        status?: string;
        message?: string;
        inserted?: { id?: string };
      };
      if (!res.ok || payload.status === 'error') {
        const detail = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail ?? payload);
        throw new Error(detail || payload.message || `HTTP ${res.status}`);
      }
      const insertedId = payload.inserted?.id;
      if (typeof insertedId === 'string' && insertedId.trim()) {
        setSavedSessionId(insertedId);
      }
      setSaveErrorMsg(null);
      console.log('[Avatar] Transcript and report saved successfully.');
    } catch (err) {
      setSavedSessionId(null);
      setSaveErrorMsg(extractErrorMessage(err));
      console.error('[Avatar] Failed to save transcript:', err);
    }
  };

  const handlePhoneCall = async () => {
    if (!studentId && !studentPhone) {
      setErrorMsg('Missing student profile phone. Please complete onboarding first.');
      return;
    }

    setIsCalling(true);
    setErrorMsg(null);
    try {
      const recentTranscript = transcriptRef.current
        .split('\n')
        .filter((line) => line.trim())
        .slice(-8)
        .join('\n');

      const res = await fetch('http://localhost:8000/api/v1/calls/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          student_phone: studentPhone,
          student_name: studentName,
          context: recentTranscript,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`,
        );
      }
    } catch (err) {
      setErrorMsg(`Call failed: ${extractErrorMessage(err)}`);
    } finally {
      setIsCalling(false);
    }
  };

  // ─── Status indicator ────────────────────────────────────────────────────────

  const StatusBadge = () => {
    if (status === 'connecting') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#fffbeb', border: '1px solid #fde68a',
          color: '#b45309', fontSize: '11px', fontWeight: 600,
          padding: '5px 12px', borderRadius: '999px',
        }}>
          <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
          Connecting…
        </div>
      );
    }
    if (status === 'connected') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#15803d', fontSize: '11px', fontWeight: 600,
          padding: '5px 12px', borderRadius: '999px',
        }}>
          <Wifi style={{ width: 12, height: 12 }} />
          Live
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', fontSize: '11px', fontWeight: 600,
          padding: '5px 12px', borderRadius: '999px',
        }}>
          <WifiOff style={{ width: 12, height: 12 }} />
          Error
        </div>
      );
    }
    if (status === 'ended') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          color: '#64748b', fontSize: '11px', fontWeight: 600,
          padding: '5px 12px', borderRadius: '999px',
        }}>
          <PhoneOff style={{ width: 12, height: 12 }} />
          Ended
        </div>
      );
    }
    return null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc' }}
    >

      {/* ── Header ── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          maxWidth: 1600, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, height: 60,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
            }}>
              <GraduationCap style={{ width: 18, height: 18, color: '#ffffff' }} />
            </div>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
              StudyAbroad<span style={{ color: '#2563eb' }}>.AI</span>
            </span>
          </div>

          {/* Status + End button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge />
            <button
              id="end-session-btn"
              onClick={handleEndSession}
              disabled={status === 'ended' || status === 'connecting'}
              style={{
                fontSize: 12, fontWeight: 600,
                background: status === 'ended' || status === 'connecting' ? '#f1f5f9' : '#dc2626',
                color: status === 'ended' || status === 'connecting' ? '#94a3b8' : '#ffffff',
                border: 'none',
                padding: '8px 16px', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: status === 'ended' || status === 'connecting' ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <PhoneOff style={{ width: 13, height: 13 }} />
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div
        className="flex-1 flex flex-col xl:flex-row gap-5 min-h-0 overflow-hidden"
        style={{
          maxWidth: 1600, margin: '0 auto', width: '100%',
          padding: '20px 24px',
        }}
      >

        {/* ── Left: Avatar Video ── */}
        <div className="w-full xl:w-[340px] xl:flex-shrink-0 flex flex-col gap-4">

          {/* Video container */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '3/4',
            background: '#e2e8f0', borderRadius: 20, overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            {/* Loading overlay */}
            {status === 'connecting' && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', gap: 12,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 style={{ width: 26, height: 26, color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Connecting to AI…</p>
              </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', gap: 12, padding: '0 24px', textAlign: 'center',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertCircle style={{ width: 26, height: 26, color: '#dc2626' }} />
                </div>
                <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>Connection Failed</p>
                {errorMsg && <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>{errorMsg}</p>}
                <button
                  onClick={() => { setStatus('idle'); startSession(); }}
                  style={{
                    marginTop: 4, fontSize: 12, fontWeight: 600,
                    background: '#2563eb', color: '#ffffff',
                    border: 'none', borderRadius: 10,
                    padding: '8px 18px', cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* The actual video element — Anam SDK needs this id */}
            <video
              id="anam-video-element"
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Live pulse indicator */}
            {status === 'connected' && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                borderRadius: 999, padding: '4px 10px',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#ef4444', display: 'inline-block',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
              </div>
            )}
          </div>

          {/* Session stats card */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 16, padding: '16px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Session Info</p>
            {[
              { label: 'AI Counselor', value: 'StudyAbroad AI', icon: '' },
              { label: 'Messages', value: messages.length.toString(), icon: '' },
              { label: 'Status', value: status === 'connected' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1), icon: '' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>{s.icon} {s.label}</span>
                <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 8, paddingTop: 12 }}>
              <button
                onClick={handlePhoneCall}
                disabled={isCalling}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  color: '#1d4ed8', fontWeight: 600, fontSize: 12,
                  padding: '10px 16px', borderRadius: 10,
                  cursor: isCalling ? 'not-allowed' : 'pointer',
                  opacity: isCalling ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
              >
                <PhoneOff style={{ width: 13, height: 13, color: '#2563eb' }} />
                {isCalling ? 'Calling...' : 'Connect via Phone Call'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Chat panel ── */}
        <div
          className="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0"
          style={{
            background: '#ffffff', borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            maxHeight: 'calc(100vh - 96px)',
          }}
        >

          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30 flex-shrink-0">
              <span className="text-base leading-none">AI</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>AI Counselor</p>
              <p style={{
                fontSize: 12, fontWeight: 500, margin: 0, marginTop: 2,
                color: status === 'connected' ? '#15803d' : '#94a3b8',
              }}>
                {status === 'connected'
                  ? 'Live conversation'
                  : status === 'connecting'
                  ? 'Connecting…'
                  : status === 'ended'
                  ? 'Session ended'
                  : status === 'error'
                  ? 'Connection error'
                  : 'Starting…'}
              </p>
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>{messages.length} msgs</div>
          </div>

          {(savedSessionId || saveErrorMsg) && (
            <div style={{
              padding: '8px 20px', borderBottom: '1px solid',
              fontSize: 11, fontWeight: 500,
              borderColor: savedSessionId ? '#bbf7d0' : '#fecaca',
              background: savedSessionId ? '#f0fdf4' : '#fef2f2',
              color: savedSessionId ? '#15803d' : '#dc2626',
            }}>
              {savedSessionId
                ? `Saved Session ID: ${savedSessionId}`
                : `Save failed: ${saveErrorMsg}`}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Empty state */}
            {messages.length === 0 && status !== 'error' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-3xl">AI</span>
                </div>
                <div>
                  <p style={{ color: '#475569', fontSize: 14, fontWeight: 600, margin: 0 }}>Session starting…</p>
                  <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Your AI counselor will greet you shortly.</p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar icon */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      msg.role === 'ai'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        : 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200'
                    }`}
                  >
                    {msg.role === 'ai' ? 'AI' : 'U'}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[78%] group ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: msg.role === 'ai' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                      fontSize: 13, lineHeight: 1.6, position: 'relative',
                      background: msg.role === 'ai' ? '#f8fafc' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      color: msg.role === 'ai' ? '#1e293b' : '#ffffff',
                      border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                      boxShadow: msg.role === 'user' ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
                    }}>
                      {msg.text}
                      {/* Streaming cursor */}
                      {msg.isStreaming && (
                        <span style={{
                          display: 'inline-block', width: 3, height: 14,
                          background: 'currentColor', marginLeft: 2, verticalAlign: 'middle',
                          borderRadius: 2, opacity: 0.7,
                          animation: 'pulse 1s ease-in-out infinite',
                        }} />
                      )}
                    </div>
                    <p style={{
                      fontSize: 10, marginTop: 4, paddingLeft: 4,
                      color: msg.role === 'ai' ? '#cbd5e1' : '#93c5fd',
                    }}>
                      {msg.timestamp}
                      {msg.isStreaming && <span className="ml-1 text-blue-400 animate-pulse">streaming</span>}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid #f1f5f9',
            background: '#ffffff', flexShrink: 0,
          }}>
            {/* Session ended banner */}
            {status === 'ended' && (
              <div style={{
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <PhoneOff style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
                <p style={{ color: '#64748b', fontSize: 12, fontWeight: 500, margin: 0 }}>Session ended. Transcript has been saved.</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Mic button */}
              <button
                id="mic-toggle-btn"
                onClick={handleMuteToggle}
                disabled={status !== 'connected'}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: '1px solid',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: status !== 'connected' ? 'not-allowed' : 'pointer',
                  background: status !== 'connected'
                    ? '#f1f5f9'
                    : isMuted
                    ? '#fef2f2'
                    : '#eff6ff',
                  borderColor: status !== 'connected'
                    ? '#e2e8f0'
                    : isMuted
                    ? '#fecaca'
                    : '#bfdbfe',
                  color: status !== 'connected'
                    ? '#cbd5e1'
                    : isMuted
                    ? '#dc2626'
                    : '#2563eb',
                  transition: 'all 0.15s',
                }}
              >
                {isMuted ? <MicOff style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 18, height: 18 }} />}
              </button>

              {/* Text input */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '10px 16px',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    status === 'connected'
                      ? 'Type a message or just speak…'
                      : status === 'ended'
                      ? 'Session ended'
                      : 'Waiting for connection…'
                  }
                  disabled={status !== 'connected'}
                  style={{
                    flex: 1, fontSize: 13, color: '#0f172a',
                    background: 'transparent', border: 'none', outline: 'none',
                    cursor: status !== 'connected' ? 'not-allowed' : 'text',
                  }}
                />
              </div>

              {/* Send button */}
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim() || status !== 'connected'}
                title="Send message"
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none',
                  background: !input.trim() || status !== 'connected' ? '#f1f5f9' : '#2563eb',
                  color: !input.trim() || status !== 'connected' ? '#cbd5e1' : '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: !input.trim() || status !== 'connected' ? 'not-allowed' : 'pointer',
                  boxShadow: !input.trim() || status !== 'connected' ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
                  transition: 'all 0.15s',
                }}
              >
                <Send style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Muted hint */}
            {isMuted && status === 'connected' && (
              <p style={{
                textAlign: 'center', fontSize: 11, color: '#dc2626',
                fontWeight: 500, marginTop: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <MicOff style={{ width: 11, height: 11 }} />
                Microphone muted — your voice won&apos;t be captured
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
