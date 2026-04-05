'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, ArrowRight, CheckCircle2, GraduationCap, PhoneOff } from 'lucide-react';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';
import AvatarBox from '@/components/shared/AvatarBox';
import ChatBubble from '@/components/shared/ChatBubble';
import { onboardingQuestions } from '@/lib/mockData';
import { extractLeadData } from '@/lib/vapiLeadParser';

type Message = {
  id: string;
  role: 'ai' | 'user';
  message: string;
  timestamp: string;
};

type CallLogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'error';
  message: string;
};

const STRUCTURED_JSON_WAIT_MS = 5 * 60 * 1000;
const STRUCTURED_JSON_POLL_MS = 5000;

const aiGreeting = "Hello! I'm your AI Study Abroad Counselor. I'm here to help you find the perfect university and course abroad. This will take just 2–3 minutes. Ready to start?";

const stripEmoji = (value: string) => value.replace(/\p{Extended_Pictographic}/gu, '').trim();

const isBenignEndedError = (error: unknown) => {
  if (!error) return false;

  if (typeof error === 'string') {
    const lowered = error.toLowerCase();
    return (
      lowered.includes('meeting has ended') ||
      lowered.includes('ended due to ejection') ||
      lowered.includes('meeting ended') ||
      lowered.includes('ejected')
    );
  }

  if (typeof error !== 'object') {
    return false;
  }

  const obj = error as Record<string, unknown>;
  const topType = typeof obj.type === 'string' ? obj.type.toLowerCase() : '';

  const nestedError =
    obj.error && typeof obj.error === 'object'
      ? (obj.error as Record<string, unknown>)
      : null;
  const nestedType = nestedError && typeof nestedError.type === 'string' ? nestedError.type.toLowerCase() : '';
  const nestedMsg = nestedError && typeof nestedError.msg === 'string' ? nestedError.msg.toLowerCase() : '';
  const nestedErrorMsg =
    nestedError && typeof nestedError.errorMsg === 'string'
      ? nestedError.errorMsg.toLowerCase()
      : '';

  const textBlob = [topType, nestedType, nestedMsg, nestedErrorMsg].join(' ');

  return (
    textBlob.includes('ejected') ||
    textBlob.includes('meeting has ended') ||
    textBlob.includes('meeting ended')
  );
};

export default function OnboardingPage() {
  const vapiRef = useRef<Vapi | null>(null);
  const vapiMessagesRef = useRef<unknown[]>([]);
  const persistInFlightRef = useRef(false);
  const messageCounterRef = useRef(1);
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'ai', message: aiGreeting, timestamp: 'Now' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState('');
  const [persistNotice, setPersistNotice] = useState('');
  const [persistMeta, setPersistMeta] = useState<{ studentId?: string; callSessionId?: string } | null>(null);
  const [lastStructuredJson, setLastStructuredJson] = useState<string>('');
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const vapiAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  const pythonBackendUrl = process.env.NEXT_PUBLIC_PY_BACKEND_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addCallLog = useCallback((level: CallLogEntry['level'], message: string) => {
    const entry: CallLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      message,
    };

    setCallLogs((prev) => [...prev.slice(-11), entry]);
  }, []);

  const waitForStructuredOutput = useCallback(async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < STRUCTURED_JSON_WAIT_MS) {
      const lead = extractLeadData(vapiMessagesRef.current);
      if (lead.structuredOutput) {
        return lead;
      }

      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      addCallLog('info', `Waiting for structured JSON from Vapi... ${elapsedSec}s elapsed`);
      await new Promise((resolve) => setTimeout(resolve, STRUCTURED_JSON_POLL_MS));
    }

    return extractLeadData(vapiMessagesRef.current);
  }, [addCallLog]);

  const persistLeadToBackend = useCallback(async (reason: string) => {
    if (persistInFlightRef.current) {
      return;
    }

    persistInFlightRef.current = true;
    setPersistNotice('Waiting for final structured JSON from Vapi...');
    addCallLog('info', `${reason}: waiting up to 5 minutes for Vapi structured output.`);

    const lead = await waitForStructuredOutput();

    if (!lead.structuredOutput) {
      setPersistNotice('Timed out waiting for structured JSON from Vapi. Nothing was pushed to Supabase.');
      addCallLog('error', `${reason}: timed out after 5 minutes waiting for structured JSON.`);
      persistInFlightRef.current = false;
      return;
    }

    setLastStructuredJson(JSON.stringify(lead.structuredOutput, null, 2));
    setIsSavingProfile(true);
    setPersistNotice('Saving structured lead data to backend...');
    setPersistMeta(null);
    addCallLog('info', `${reason}: Extracting session parameters. Sending to backend ingest...`);

    const call_session = vapiMessagesRef.current.find(m => typeof m === 'object' && m && (m as any).type === 'call-start') as any;
    const call_id = call_session?.call?.id;
    addCallLog('info', `Found call_id: ${call_id || 'UNKNOWN'}`);

    try {
      const response = await fetch(`${pythonBackendUrl}/api/v1/vapi/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: call_id || 'UNKNOWN_CALL_ID',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Backend rejected lead ingest');
      }

      const result = (await response.json()) as {
        student_id?: string;
        call_session_id?: string;
        generated_events?: any[];
      };

      setPersistNotice('Lead profile and call session saved to Supabase.');
      setPersistMeta({
        studentId: result.student_id,
        callSessionId: result.call_session_id,
      });

      if (result.generated_events) {
        localStorage.setItem('onboardingEvents', JSON.stringify(result.generated_events));
      }

      addCallLog(
        'success',
        `Saved to Supabase. student_id=${result.student_id || 'n/a'}, call_session_id=${result.call_session_id || 'n/a'}`
      );
    } catch (error) {
      console.error(error);
      setPersistNotice('Voice call ended, but saving to backend failed. Check backend env and CORS.');
      setPersistMeta(null);
      addCallLog('error', `${reason}: Backend ingest failed.`);
    } finally {
      setIsSavingProfile(false);
      persistInFlightRef.current = false;
    }
  }, [addCallLog, pythonBackendUrl, vapiAssistantId, waitForStructuredOutput]);

  useEffect(() => {
    if (!vapiPublicKey) {
      return;
    }

    const client = new Vapi(vapiPublicKey);
    vapiRef.current = client;

    const addTranscriptMessage = (role: 'ai' | 'user', text: string) => {
      if (!text.trim()) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(role),
          role,
          message: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    };

    const onCallStart = () => {
      setVoiceStatus('live');
      setIsListening(true);
      setVoiceError('');
      addTranscriptMessage('ai', 'Voice session connected. You can now speak naturally.');
    };

    const onCallEnd = async () => {
      setVoiceStatus('idle');
      setIsListening(false);
      addCallLog('info', 'Call ended. Preparing Supabase ingest.');
      await persistLeadToBackend('call-end');
    };

    const onMessage = (message: unknown) => {
      vapiMessagesRef.current = [...vapiMessagesRef.current, message];

      if (!message || typeof message !== 'object') {
        return;
      }

      const msg = message as Record<string, unknown>;
      const type = typeof msg.type === 'string' ? msg.type : '';

      if (type === 'transcript') {
        const transcriptType = typeof msg.transcriptType === 'string' ? msg.transcriptType : '';
        const transcript = typeof msg.transcript === 'string' ? msg.transcript : '';
        const role = msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : null;

        if (transcriptType === 'final' && role && transcript.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextMessageId(role),
              role,
              message: transcript,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }

      if (typeof msg.name === 'string' && msg.name === 'lead_info') {
        setPersistNotice('Structured lead output received. It will be saved when call ends.');
        addCallLog('info', 'Received lead_info structured output from Vapi.');
      }
    };

    const onError = (error: unknown) => {
      if (isBenignEndedError(error)) {
        setVoiceStatus('idle');
        setIsListening(false);
        setPersistNotice((prev) => prev || 'Call ended by server.');
        addCallLog('info', 'Call ended by server/ejection. Attempting Supabase ingest.');
        void persistLeadToBackend('server-end');
        return;
      }

      console.error(error);
      setVoiceStatus('error');
      setIsListening(false);
      setVoiceError('Vapi call failed. Please verify your public key and assistant id.');
    };

    const onCallStartFailed = (event: unknown) => {
      console.error('Vapi call-start-failed:', event);
      setVoiceStatus('error');
      setIsListening(false);

      const details =
        event && typeof event === 'object'
          ? JSON.stringify(event)
          : String(event || 'Unknown error');
      setVoiceError(`Vapi call start failed: ${details}`);
      addCallLog('error', `Call start failed: ${details}`);
    };

    client.on('call-start', onCallStart);
    client.on('call-end', onCallEnd);
    client.on('message', onMessage);
    client.on('error', onError);
    client.on('call-start-failed', onCallStartFailed);

    return () => {
      client.removeAllListeners();
      void client.stop().catch(() => {
        // Ignore stop errors during unmount; meeting may already be closed by server.
      });
      vapiRef.current = null;
    };
  }, [addCallLog, persistLeadToBackend, vapiPublicKey]);

  const currentQuestion = onboardingQuestions[step];

  const nextMessageId = (prefix: 'ai' | 'user') => {
    const id = `${prefix}-${messageCounterRef.current}`;
    messageCounterRef.current += 1;
    return id;
  };

  const addAIMessage = (msg: string) => {
    return new Promise<void>((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId('ai'),
            role: 'ai',
            message: msg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        resolve();
      }, 1500);
    });
  };

  const handleOptionSelect = async (option: string) => {
    const userMsg: Message = {
      id: nextMessageId('user'),
      role: 'user',
      message: option,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAnswers((prev) => ({ ...prev, [currentQuestion.field]: option }));

    const nextStep = step + 1;

    if (nextStep >= onboardingQuestions.length) {
      await addAIMessage("Perfect! I've collected all the information I need. Let me analyze your profile and prepare your personalized study abroad plan...");
      setTimeout(() => {
        setCompleted(true);
      }, 2000);
    } else {
      await addAIMessage(onboardingQuestions[nextStep].question);
      setStep(nextStep);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    handleOptionSelect(inputValue.trim());
    setInputValue('');
  };

  const handleVoiceToggle = async () => {
    if (!vapiRef.current) {
      setVoiceError('Vapi is not initialized. Add NEXT_PUBLIC_VAPI_PUBLIC_KEY in frontend .env.local');
      setVoiceStatus('error');
      return;
    }

    if (!vapiAssistantId) {
      setVoiceError('Missing NEXT_PUBLIC_VAPI_ASSISTANT_ID in frontend .env.local');
      setVoiceStatus('error');
      return;
    }

    setVoiceError('');

    if (voiceStatus === 'live' || voiceStatus === 'connecting') {
      return;
    }

    vapiMessagesRef.current = [];
    persistInFlightRef.current = false;
    setLastStructuredJson('');
    setPersistMeta(null);
    setPersistNotice('');
    addCallLog('info', 'Starting Vapi voice call...');
    setVoiceStatus('connecting');
    try {
      await vapiRef.current.start(vapiAssistantId);
    } catch (error) {
      console.error(error);
      setVoiceStatus('error');
      setIsListening(false);
      setVoiceError('Could not start voice call. Check browser mic permissions.');
      addCallLog('error', 'Could not start Vapi call.');
    }
  };

  const handleEndCall = async () => {
    if (!vapiRef.current || (voiceStatus !== 'live' && voiceStatus !== 'connecting')) {
      addCallLog('info', 'End Call clicked, but no active call was found.');
      return;
    }

    addCallLog('info', 'End Call clicked. Stopping voice session...');

    try {
      await vapiRef.current.stop();
    } catch {
      // Meeting may already be ended/ejected.
    } finally {
      setVoiceStatus('idle');
      setIsListening(false);
      // Ensure save attempt even if call-end event is missed.
      await persistLeadToBackend('manual-end');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-blue-100 overflow-hidden">
      {/* Clean, App-like Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm shrink-0">
        <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                StudyAbroad<span className="text-blue-600">.AI</span>
              </span>
            </Link>

            {/* Elegant Progress Dots */}
            <div className="hidden md:flex items-center gap-2">
              {onboardingQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-700 ease-out ${
                    i < step
                      ? 'w-8 bg-blue-600 shadow-sm shadow-blue-600/20'
                      : i === step
                      ? 'w-10 bg-blue-400'
                      : 'w-3 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="text-sm font-bold text-slate-500 bg-slate-100/80 px-4 py-2 rounded-full border border-slate-200/50">
              Step {Math.min(step + 1, onboardingQuestions.length)} <span className="font-medium text-slate-400">/ {onboardingQuestions.length}</span>
            </div>
          </div>
        </div>
        {/* Subtle continuous progress line */}
        <div className="h-[2px] bg-transparent w-full relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-blue-600"
            animate={{ width: `${(step / onboardingQuestions.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      </header>

      {/* Main Spaced Layout */}
      <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-6 lg:px-10 py-8 lg:py-10 min-h-0">
        {completed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-auto w-full max-w-2xl text-center py-16 px-10 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-green-100">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Profile Configured</h2>
            <p className="text-slate-500 text-lg mb-10 font-medium">Your AI counselor has optimized your readiness plan.</p>
            
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-transform hover:-translate-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Readiness Score</p>
                <p className="text-4xl font-black text-blue-600">78%</p>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 transition-transform hover:-translate-y-1">
                <p className="text-xs text-rose-400 uppercase tracking-widest mb-2 font-bold">Classification</p>
                <p className="text-3xl font-black text-rose-600 tracking-tight flex items-center justify-center gap-2">
                  Hot
                </p>
              </div>
            </div>

            <Link href="/dashboard" className="block w-full outline-none">
              <button className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg px-8 py-5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5">
                Take Me to Dashboard
                <ArrowRight className="w-6 h-6" />
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-14 flex-1 min-h-0 h-full w-full">
            
            {/* LEFT: Avatar & Info Column */}
            <div className="hidden lg:flex flex-col gap-8 h-full min-h-[500px]">
              <div className="flex-1 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] bg-white rounded-3xl relative">
                <AvatarBox label="Voice Session Active" isActive={isListening || voiceStatus === 'connecting'} />
              </div>

              {/* Classy context tags */}
              <div className="flex flex-wrap gap-3 justify-center shrink-0">
                {['Profile Analysis', 'Smart Matching', 'Data Sync'].map((tag) => (
                  <span key={tag} className="text-sm font-medium text-slate-400 tracking-wide bg-transparent px-3 py-1">
                     {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT: Chat Interface */}
            <div className="flex flex-col bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl overflow-hidden h-[650px] lg:h-full relative">
              
              {/* Chat Header */}
              <div className="shrink-0 flex items-center justify-between px-8 pt-8 pb-4 z-10 w-full">
                <div className="flex items-center gap-4">
                  <div className={`relative flex items-center justify-center w-3 h-3 rounded-full ${
                      voiceStatus === 'live' ? 'bg-green-500' : 'bg-blue-400'
                    }`}>
                    {voiceStatus === 'live' && (
                      <span className="absolute w-full h-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-slate-800 tracking-tight">Counseling Session</h3>
                    <p className={`text-sm tracking-wide mt-0.5 transition-colors ${
                      voiceStatus === 'live' ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {voiceStatus === 'live' ? 'Voice Active' : 'System Connected'}
                    </p>
                  </div>
                </div>
                
                <div className="text-sm font-medium text-slate-300 tracking-wide">
                  Step {step}
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef} 
                className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scroll-smooth"
              >
                {messages.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={msg.id}
                  >
                    <ChatBubble
                      role={msg.role}
                      message={stripEmoji(msg.message)}
                      timestamp={msg.timestamp}
                    />
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <ChatBubble role="ai" message="" isTyping />
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-6" />
              </div>

              {/* Interaction Elements & Inputs */}
              <div className="shrink-0 z-10 flex flex-col mb-4">
                
                {/* Spaced Quick Replies */}
                {!isTyping && step < onboardingQuestions.length && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-8 pb-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            className="text-sm font-medium text-slate-600 bg-white/80 hover:bg-white border hover:border-slate-300 border-slate-200/60 px-5 py-2.5 rounded-2xl transition-all shadow-sm hover:shadow active:scale-95"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Status Notice Indicator */}
                <AnimatePresence>
                  {(isListening || voiceStatus === 'connecting' || isSavingProfile || voiceError || persistNotice) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-8 pb-2"
                    >
                      <div className={`text-xs font-medium px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-center transition-colors ${
                        voiceError ? 'bg-red-50/80 text-red-600' : 'bg-slate-100/50 text-slate-500'
                      }`}>
                        {voiceStatus === 'connecting' && <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                        <span className="truncate tracking-wide">
                          {voiceStatus === 'connecting' ? 'Establishing secure connection...' : null}
                          {isListening ? 'Listening...' : null}
                          {isSavingProfile ? 'Synchronizing profile...' : null}
                          {(!isSavingProfile && !isListening && !voiceStatus) && persistNotice ? stripEmoji(persistNotice) : null}
                          {voiceError ? voiceError : null}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Input Row */}
                <div className="px-8 py-2">
                  <div className="flex items-center gap-3">
                    {/* Voice Toggle */}
                    <button
                      onClick={handleVoiceToggle}
                      disabled={voiceStatus === 'live' || voiceStatus === 'connecting'}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 outline-none
                        ${(isListening || voiceStatus === 'connecting') ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-700 hover:shadow-md'}
                        disabled:opacity-90`}
                    >
                      {isListening || voiceStatus === 'connecting' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative flex items-center bg-white border border-slate-200/60 rounded-full pl-5 pr-1.5 py-1.5 transition-all shadow-sm focus-within:border-slate-300 focus-within:shadow-md hover:bg-white/90">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isListening}
                        placeholder={isListening ? 'Voice input active...' : 'Type your message...'}
                        className="flex-1 h-10 text-sm font-medium text-slate-700 placeholder-slate-400 bg-transparent outline-none disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className="shrink-0 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white flex items-center justify-center transition-all outline-none shadow-sm"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </div>
                    
                    {/* Hang Up */}
                    <button
                      onClick={handleEndCall}
                      disabled={voiceStatus !== 'live' && voiceStatus !== 'connecting'}
                      className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-rose-50 text-rose-500 transition-all outline-none hover:bg-rose-100 disabled:opacity-40 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed shadow-sm"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Neatly Hidden Developer Logs */}
                  <div className="mt-4 opacity-50 hover:opacity-100 transition-opacity">
                    <details className="group border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm transition-all open:bg-slate-50 open:border-slate-300">
                      <summary className="cursor-pointer px-5 py-3 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between outline-none select-none">
                        <span className="flex items-center gap-2">
                          <span>Advanced Logs</span>
                          {(persistMeta?.studentId || persistMeta?.callSessionId) && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md leading-none border border-emerald-200">Sync Configured</span>
                          )}
                        </span>
                        <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-5 py-4 border-t border-slate-200 space-y-4 bg-white/50">
                        {persistMeta && (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">
                            <p className="font-bold border-b border-emerald-200 pb-2 mb-2 font-mono uppercase tracking-wider">Cloud Data Persistence</p>
                            {persistMeta.studentId && <p className="truncate"><span className="font-semibold text-emerald-900/60">ID:</span> <span className="font-mono">{persistMeta.studentId}</span></p>}
                            {persistMeta.callSessionId && <p className="truncate"><span className="font-semibold text-emerald-900/60">Session:</span> <span className="font-mono">{persistMeta.callSessionId}</span></p>}
                          </div>
                        )}
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Process Logs</p>
                          <div className="max-h-40 overflow-y-auto p-3 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] space-y-1 shadow-inner">
                            {callLogs.length === 0 ? (
                              <p className="text-slate-600 italic">// Awaiting system activity...</p>
                            ) : (
                              callLogs.map((log) => (
                                <p key={log.id} className="whitespace-pre-wrap break-words leading-relaxed">
                                  <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                                  <span className={log.level === 'error' ? 'text-rose-400' : log.level === 'success' ? 'text-emerald-400' : 'text-blue-300'}>
                                    {log.message}
                                  </span>
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                        
                        {lastStructuredJson && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">Structured JSON Context</p>
                            <pre className="max-h-40 overflow-y-auto rounded-xl bg-slate-100 text-slate-700 p-4 text-[11px] font-mono border border-slate-200 shadow-inner">
                              {lastStructuredJson}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
