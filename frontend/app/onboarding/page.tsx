'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, ArrowRight, CheckCircle2, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import AvatarBox from '@/components/shared/AvatarBox';
import ChatBubble from '@/components/shared/ChatBubble';
import { onboardingQuestions } from '@/lib/mockData';

type Message = {
  id: string;
  role: 'ai' | 'user';
  message: string;
  timestamp: string;
};

const aiGreeting = "Hello! I'm your AI Study Abroad Counselor. I'm here to help you find the perfect university and course abroad. This will take just 2–3 minutes. Ready to start? 🎓";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'ai', message: aiGreeting, timestamp: 'Now' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const currentQuestion = onboardingQuestions[step];

  const addAIMessage = (msg: string) => {
    return new Promise<void>((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
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
      id: `user-${Date.now()}`,
      role: 'user',
      message: option,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAnswers((prev) => ({ ...prev, [currentQuestion.field]: option }));

    const nextStep = step + 1;

    if (nextStep >= onboardingQuestions.length) {
      await addAIMessage("Perfect! 🎉 I've collected all the information I need. Let me analyze your profile and prepare your personalized study abroad plan...");
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100">
        <div className="container-max">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm">StudyAbroad<span className="text-blue-600">.AI</span></span>
            </Link>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {onboardingQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i < step
                      ? 'w-6 bg-blue-600'
                      : i === step
                      ? 'w-8 bg-blue-500'
                      : 'w-4 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Step {Math.min(step + 1, onboardingQuestions.length)} of {onboardingQuestions.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-100 w-full">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
              animate={{ width: `${(step / onboardingQuestions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex pt-20">
        <div className="container-max flex-1 py-6">
          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center py-16"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Profile Complete! 🎉</h2>
              <p className="text-slate-600 mb-2">Your AI counselor has analyzed your profile.</p>
              <p className="text-slate-600 mb-8">Readiness Score: <span className="font-bold text-blue-600">78%</span> · Classification: <span className="font-bold text-red-500">🔥 Hot Lead</span></p>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-2">
                {Object.entries(answers).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-semibold text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 mx-auto">
                  View My Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6 h-full">
              {/* Left: Avatar */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: '500px' }}>
                  <AvatarBox label="Voice AI will be integrated here" isActive={isTyping} />
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2">
                  {['🎯 Profile Analysis', '🏛️ University Matching', '💰 Scholarship Finder', '📋 Readiness Score'].map((f) => (
                    <span key={f} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>

              {/* Right: Chat interface */}
              <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <span className="text-xl">🤖</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">AI Counselor</p>
                    <p className="text-xs text-green-600 font-medium">● Online · Ready to help</p>
                  </div>
                  <div className="ml-auto text-xs text-slate-400 font-medium">
                    {step}/{onboardingQuestions.length} Questions
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                  {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      role={msg.role}
                      message={msg.message}
                      timestamp={msg.timestamp}
                    />
                  ))}
                  {isTyping && (
                    <ChatBubble role="ai" message="" isTyping />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick reply options */}
                {!isTyping && step < onboardingQuestions.length && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-5 pb-3"
                    >
                      <p className="text-xs text-slate-400 font-medium mb-2">Quick Replies:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Input area */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    {/* Mic button */}
                    <button
                      onClick={() => setIsListening((prev) => !prev)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                        isListening
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Text input */}
                    <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isListening ? '🎙 Listening...' : 'Or type your answer here...'}
                        className="flex-1 text-sm text-slate-700 placeholder-slate-400 focus:outline-none bg-transparent"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isListening && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs text-red-500 font-medium mt-2 flex items-center justify-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Voice AI will be integrated here · Listening simulation active
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
