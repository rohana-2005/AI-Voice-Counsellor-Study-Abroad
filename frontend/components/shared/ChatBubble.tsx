'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'ai' | 'user';
  message: string;
  timestamp?: string;
  isTyping?: boolean;
}

export default function ChatBubble({ role, message, timestamp, isTyping }: ChatBubbleProps) {
  const isAI = role === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 mb-4', !isAI && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden shadow-sm border border-slate-200',
        isAI
          ? 'bg-blue-50'
          : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
      )}>
        {isAI ? (
          <img src="/ai-avatar.png" alt="AI Counselor" className="w-full h-full object-cover object-[center_20%]" />
        ) : (
          'AS'
        )}
      </div>

      <div className={cn('max-w-[80%]', !isAI && 'items-end flex flex-col')}>
        {/* Bubble */}
        <div className={cn(
          'px-4 py-3 text-sm leading-relaxed',
          isAI ? 'chat-bubble-ai' : 'chat-bubble-user'
        )}>
          {isTyping ? (
            <div className="flex gap-1 items-center h-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-slate-400"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          ) : (
            message
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-slate-400 mt-1 px-1">{timestamp}</span>
        )}
      </div>
    </motion.div>
  );
}
