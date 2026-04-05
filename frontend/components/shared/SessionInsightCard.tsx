'use client';
import { motion } from 'framer-motion';
import { MessageSquare, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

interface SessionInsightCardProps {
  id: string;
  date: string;
  duration: string;
  sentiment: string;
  lead_score: number;
  classification: 'Hot' | 'Warm' | 'Cold';
  preview: string;
  delay?: number;
}

const classificationConfig = {
  Hot: { bg: 'badge-hot', dot: 'bg-red-400', emoji: '' },
  Warm: { bg: 'badge-warm', dot: 'bg-amber-400', emoji: '' },
  Cold: { bg: 'badge-cold', dot: 'bg-indigo-400', emoji: '' },
};

const sentimentConfig = {
  positive: { color: 'text-green-600', bg: 'bg-green-50', label: 'Positive', emoji: '' },
  neutral: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Neutral', emoji: '' },
  negative: { color: 'text-red-600', bg: 'bg-red-50', label: 'Negative', emoji: '' },
};

export default function SessionInsightCard({
  id, date, duration, sentiment, lead_score, classification, preview, delay = 0
}: SessionInsightCardProps) {
  const cls = classificationConfig[classification];
  const sent = sentimentConfig[sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.15, duration: 0.4 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Session #{id.split('_')[1]}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">{date} · {duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Classification Badge */}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${cls.bg}`}>
            <span>{cls.emoji}</span>
            <span>{classification}</span>
          </span>
        </div>
      </div>

      {/* Preview */}
      <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2">{preview}</p>

      {/* Metrics row */}
      <div className="flex items-center gap-3">
        {/* Lead Score */}
        <div className="flex items-center gap-1.5 flex-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-slate-500">Lead Score</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${lead_score}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <span className="text-xs font-bold text-blue-600">{lead_score}</span>
        </div>

        {/* Sentiment */}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sent.bg} ${sent.color}`}>
          {sent.emoji} {sent.label}
        </span>
      </div>

      {/* CTA */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Link href="/session">
          <button className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors">
            View Full Transcript →
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
