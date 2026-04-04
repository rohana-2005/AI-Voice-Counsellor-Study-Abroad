'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff, GraduationCap, Phone } from 'lucide-react';
import Link from 'next/link';
import ChatBubble from '@/components/shared/ChatBubble';
import UniversityCard from '@/components/shared/UniversityCard';
import { callSession, universityRecommendations } from '@/lib/mockData';
import { createClient } from '@anam-ai/js-sdk';

export default function SessionPage() {
  const [messages, setMessages] = useState(callSession.transcript);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showRecs, setShowRecs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const aiResponses = [
    "That's a great question! Let me analyze your profile against the latest university data...",
    "Based on your 78% GPA in Computer Science, you have strong chances at Manchester and UCD. I'd recommend aiming for a 7.0+ IELTS score first.",
    "The Chevening Scholarship deadline is November 2025. With your profile, you're a competitive applicant. Shall I add a checklist for that?",
    "Great! I've added the scholarship prep to your action plan. Is there anything else you'd like to know about UK universities?",
  ];
  const [aiRespIdx, setAiRespIdx] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = null;

    const startSession = async () => {
      try {
        const res = await fetch("http://localhost:8000/anam/session", {
          method: "POST",
        });
        const data = await res.json();
        
        // Fast API returns session_token in snake_case, SDK might want either
        const token = data.session_token || data.sessionToken;
        
        if (!token) {
            console.error("Missing session token in backend response:", data);
            return;
        }

        client = createClient(token);

        // Using string ID to prevent the client context binding error
        if (videoRef.current) {
            await client.streamToVideoElement("anam-video-element");
        }
      } catch (error) {
        console.error("Failed to start Anam session:", error);
      }
    };

    startSession();

    return () => {
      if (client?.stopStreaming) {
        client.stopStreaming();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = {
      role: 'user' as const,
      message: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiMsg = {
        role: 'ai' as const,
        message: aiResponses[aiRespIdx % aiResponses.length],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setAiRespIdx((i) => i + 1);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">StudyAbroad<span className="text-blue-400">.AI</span></span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">Live Session</span>
            </div>
            <Link href="/report">
              <button className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors">
                End & View Report
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col lg:flex-row gap-6">

        {/* Left: Avatar column */}
        <div className="lg:w-80 flex flex-col gap-4">
          <div className="relative w-full aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden border-4 border-slate-700/50 shadow-xl">
            <video
              id="anam-video-element"
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Session stats */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
            {[
              { label: 'Duration', value: '18:23', icon: '⏱️' },
              { label: 'Sentiment', value: 'Positive 😊', icon: '💬' },
              { label: 'Lead Score', value: '78 / 100', icon: '🎯' },
              { label: 'Classification', value: '🔥 Hot', icon: '📊' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">{s.icon} {s.label}</span>
                <span className="text-white text-xs font-semibold">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Phone option */}
          <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 py-3 rounded-2xl transition-colors">
            <Phone className="w-4 h-4" />
            Switch to Phone Call
          </button>
        </div>

        {/* Center: Chat transcript */}
        <div className="flex-1 flex flex-col bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden min-h-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-base">🤖</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Counselor</p>
              <p className="text-xs text-green-400">● Active Session · {callSession.date}</p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {/* Dark mode chat bubbles overrides */}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    msg.role === 'ai'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                      : 'bg-gradient-to-br from-slate-500 to-slate-700 text-white'
                  }`}>
                    {msg.role === 'ai' ? '🤖' : 'AS'}
                  </div>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-slate-700 text-slate-200 rounded-tl-sm'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                  }`}>
                    {msg.message}
                    <p className={`text-xs mt-1.5 ${msg.role === 'ai' ? 'text-slate-500' : 'text-blue-200'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                  <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-slate-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="px-5 py-4 border-t border-slate-700 bg-slate-800/80">
            <div className="flex items-center gap-3">
              {/* Big mic button */}
              <button
                onClick={() => setIsListening((prev) => !prev)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-900/40 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40'
                }`}
              >
                {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>

              <div className="flex-1 flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-2xl px-4 py-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? '🎙 Listening...' : 'Type your message...'}
                  className="flex-1 text-sm text-slate-200 placeholder-slate-500 focus:outline-none bg-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {isListening && (
              <p className="text-center text-xs text-red-400 font-medium mt-2 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Voice AI will be integrated here · Simulation mode active
              </p>
            )}
          </div>
        </div>

        {/* Right: Dynamic recommendations */}
        {showRecs && (
          <div className="lg:w-72 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-slate-300 text-sm font-semibold">🎓 Recommended Universities</p>
              <button onClick={() => setShowRecs(false)} className="text-slate-600 text-xs hover:text-slate-400">Hide</button>
            </div>
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {universityRecommendations.slice(0, 3).map((uni, i) => (
                <div key={uni.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-blue-500/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{uni.flag}</span>
                    <div>
                      <p className="text-white text-xs font-semibold">{uni.name}</p>
                      <p className="text-slate-500 text-xs">{uni.ranking}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-blue-400">{uni.match}%</span>
                  </div>
                  <p className="text-xs text-blue-300 bg-blue-900/30 rounded-lg px-2 py-1">{uni.course}</p>
                  <p className="text-xs text-slate-400 mt-2">💰 {uni.tuition}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
