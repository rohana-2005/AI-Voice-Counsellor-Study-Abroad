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

export default function Avatar() {
  // Session state
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);

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
      await fetch('http://localhost:8000/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript || transcriptRef.current }),
      });
      console.log('[Avatar] Transcript saved successfully.');
    } catch (err) {
      console.error('[Avatar] Failed to save transcript:', err);
    }
  };

  // ─── Status indicator ────────────────────────────────────────────────────────

  const StatusBadge = () => {
    if (status === 'connecting') {
      return (
        <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting…
        </div>
      );
    }
    if (status === 'connected') {
      return (
        <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <Wifi className="w-3 h-3" />
          Live
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <WifiOff className="w-3 h-3" />
          Error
        </div>
      );
    }
    if (status === 'ended') {
      return (
        <div className="flex items-center gap-1.5 bg-slate-500/20 border border-slate-500/30 text-slate-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <PhoneOff className="w-3 h-3" />
          Ended
        </div>
      );
    }
    return null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 flex-shrink-0 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">
              StudyAbroad<span className="text-blue-400">.AI</span>
            </span>
          </div>

          {/* Status + End button */}
          <div className="flex items-center gap-3">
            <StatusBadge />
            <button
              id="end-session-btn"
              onClick={handleEndSession}
              disabled={status === 'ended' || status === 'connecting'}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col xl:flex-row gap-4 sm:gap-6 min-h-0 overflow-hidden">

        {/* ── Left: Avatar Video ── */}
        <div className="w-full xl:w-[340px] xl:flex-shrink-0 flex flex-col gap-4">

          {/* Video container */}
          <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/40">
            {/* Loading overlay */}
            {status === 'connecting' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Connecting to AI…</p>
              </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 gap-3 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-red-400 text-sm font-semibold">Connection Failed</p>
                {errorMsg && <p className="text-slate-500 text-xs leading-relaxed">{errorMsg}</p>}
                <button
                  onClick={() => { setStatus('idle'); startSession(); }}
                  className="mt-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
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
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[10px] font-semibold uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>

          {/* Session stats card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Session Info</p>
            {[
              { label: 'AI Counselor', value: 'StudyAbroad AI', icon: '🤖' },
              { label: 'Messages', value: messages.length.toString(), icon: '💬' },
              { label: 'Status', value: status === 'connected' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1), icon: '📡' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">{s.icon} {s.label}</span>
                <span className="text-slate-200 text-xs font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Chat panel ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden min-h-0" style={{ maxHeight: 'calc(100vh - 96px)' }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30 flex-shrink-0">
              <span className="text-base leading-none">🤖</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">AI Counselor</p>
              <p className={`text-xs font-medium ${status === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
                {status === 'connected'
                  ? '● Live conversation'
                  : status === 'connecting'
                  ? '⟳ Connecting…'
                  : status === 'ended'
                  ? 'Session ended'
                  : status === 'error'
                  ? '✕ Connection error'
                  : 'Starting…'}
              </p>
            </div>
            <div className="text-xs text-slate-600 font-mono">{messages.length} msgs</div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-3">
            {/* Empty state */}
            {messages.length === 0 && status !== 'error' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-3xl">🎓</span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold">Session starting…</p>
                  <p className="text-slate-600 text-xs mt-1">Your AI counselor will greet you shortly.</p>
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
                    {msg.role === 'ai' ? '🤖' : 'U'}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[78%] group ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative ${
                        msg.role === 'ai'
                          ? 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60'
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-lg shadow-blue-900/30'
                      }`}
                    >
                      {msg.text}
                      {/* Streaming cursor */}
                      {msg.isStreaming && (
                        <span className="inline-block w-1 h-4 bg-current ml-0.5 align-middle animate-pulse rounded-sm opacity-70" />
                      )}
                    </div>
                    <p className={`text-[10px] mt-1 px-1 ${msg.role === 'ai' ? 'text-slate-600' : 'text-blue-400/60'}`}>
                      {msg.timestamp}
                      {msg.isStreaming && <span className="ml-1 text-blue-400 animate-pulse">● streaming</span>}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          <div className="px-4 sm:px-5 py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur flex-shrink-0">
            {/* Session ended banner */}
            {status === 'ended' && (
              <div className="mb-3 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5">
                <PhoneOff className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <p className="text-slate-400 text-xs font-medium">Session ended. Transcript has been saved.</p>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {/* Mic button */}
              <button
                id="mic-toggle-btn"
                onClick={handleMuteToggle}
                disabled={status !== 'connected'}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                  status !== 'connected'
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : isMuted
                    ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                    : 'bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text input */}
              <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 focus-within:border-blue-500/60 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] rounded-2xl px-4 py-3 transition-all">
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
                  className="flex-1 text-sm text-slate-200 placeholder-slate-600 focus:outline-none bg-transparent disabled:cursor-not-allowed"
                />
              </div>

              {/* Send button */}
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim() || status !== 'connected'}
                title="Send message"
                className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-lg shadow-blue-900/30 disabled:shadow-none"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Muted hint */}
            {isMuted && status === 'connected' && (
              <p className="text-center text-xs text-red-400/80 font-medium mt-2 flex items-center justify-center gap-1.5">
                <MicOff className="w-3 h-3" />
                Microphone muted — your voice won&apos;t be captured
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
