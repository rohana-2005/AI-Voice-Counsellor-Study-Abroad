'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { callSession, student, universityRecommendations } from '@/lib/mockData';
import ProgressCircle from '@/components/shared/ProgressCircle';

export default function ReportPage() {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timelineSteps = [
    { label: 'Profile Assessment', status: 'done', date: 'Mar 2026', icon: 'Done' },
    { label: 'AI Counseling Session', status: 'done', date: 'Apr 2026', icon: 'Done' },
    { label: 'IELTS Examination', status: 'current', date: 'May 2026', icon: 'Now' },
    { label: 'University Applications', status: 'pending', date: 'Jun 2026', icon: 'Next' },
    { label: 'Offer Letters', status: 'pending', date: 'Aug 2026', icon: 'Next' },
    { label: 'Visa Application', status: 'pending', date: 'Sep 2026', icon: 'Next' },
    { label: 'University Enrollment', status: 'pending', date: 'Sep 2026', icon: 'Next' },
  ];

  const clsConfig = {
    Hot: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', emoji: '' },
    Warm: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', emoji: '' },
    Cold: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', emoji: '' },
  };
  const cls = clsConfig[callSession.classification];

  return (
    <DashboardLayout
      title="Session Report"
      subtitle={`Generated from AI counseling session · ${callSession.date}`}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end mb-4">
          <button className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200">
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
        {/* Report header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Session Report</p>
              <h1 className="text-3xl font-extrabold mb-1">{student.full_name}</h1>
              <p className="text-blue-200 text-sm">{callSession.date} · {callSession.duration}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20`}>
                  {cls.emoji} {callSession.classification} Lead
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  Score: {callSession.lead_score}/100
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  Top Match: UK
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center bg-white/10 rounded-2xl p-5 border border-white/20">
              <ProgressCircle percentage={callSession.lead_score} size={120} strokeWidth={10} label="Overall" color="#60a5fa" />
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Score breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-5">Score Breakdown</h2>
              <div className="space-y-4">
                {[
                  { label: 'Academic Score', score: callSession.score_breakdown.academic, color: 'bg-blue-500', desc: 'GPA, field, institution' },
                  { label: 'Financial Score', score: callSession.score_breakdown.financial, color: 'bg-green-500', desc: 'Budget range, scholarship eligibility' },
                  { label: 'Clarity Score', score: callSession.score_breakdown.clarity, color: 'bg-purple-500', desc: 'Goals, decision confidence' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.score}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${item.color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Insight */}
              <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-800 leading-relaxed">
                  <span className="font-bold">AI Insight: </span>{callSession.insight_text}
                </p>
              </div>
            </motion.div>

            {/* Recommended Actions Checklist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">Recommended Actions</h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {checkedItems.size}/{callSession.recommended_actions.length} Done
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                <motion.div
                  className="h-full bg-linear-to-r from-green-400 to-green-600 rounded-full"
                  animate={{ width: `${(checkedItems.size / callSession.recommended_actions.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="space-y-3">
                {callSession.recommended_actions.map((action) => {
                  const isDone = checkedItems.has(action.id);
                  return (
                    <motion.div
                      key={action.id}
                      whileHover={{ x: 2 }}
                      onClick={() => toggleCheck(action.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isDone ? 'bg-green-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {action.action}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        action.priority === 'High' ? 'bg-red-50 text-red-600' :
                        action.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {action.priority}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top Recommended Universities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-5">Top University Matches</h2>
              <div className="space-y-3">
                {universityRecommendations.slice(0, 3).map((uni) => (
                  <div key={uni.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
                    <span className="text-2xl">{uni.flag}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{uni.name}</p>
                      <p className="text-xs text-slate-500">{uni.course} · {uni.tuition}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{uni.match}% match</p>
                      <p className="text-xs text-slate-400">{uni.ranking}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column: Timeline */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-5">Your Timeline</h2>

              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-5">
                  {timelineSteps.map((step, i) => {
                    const isDone = step.status === 'done';
                    const isCurrent = step.status === 'current';

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-start gap-4 pl-2"
                      >
                        <div className={`relative z-10 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                          isDone ? 'bg-green-500' :
                          isCurrent ? 'bg-blue-500 ring-4 ring-blue-100' :
                          'bg-slate-200'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> :
                           isCurrent ? <div className="w-2 h-2 bg-white rounded-full" /> :
                           <div className="w-2 h-2 bg-slate-400 rounded-full" />}
                        </div>

                        <div>
                          <p className={`text-sm font-semibold ${isDone ? 'text-slate-500' : isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>
                            {step.icon} {step.label}
                          </p>
                          <p className="text-xs text-slate-400">{step.date}</p>
                          {isCurrent && (
                            <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                              Current Step
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Session summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-4">Session Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Student</span>
                  <span className="text-xs font-semibold text-slate-800">{student.full_name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Recommended Country</span>
                  <span className="text-xs font-semibold text-blue-600">United Kingdom</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Lead Score</span>
                  <span className="text-xs font-bold text-slate-800">{callSession.lead_score}/100</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Classification</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
                    {cls.emoji} {callSession.classification}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-500">Scholarship Interest</span>
                  <span className="text-xs font-semibold text-green-600">Yes</span>
                </div>
              </div>
            </motion.div>

            {/* CTA card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white"
            >
              <h3 className="font-bold mb-2 text-base">Ready for Next Steps?</h3>
              <p className="text-blue-200 text-xs mb-4 leading-relaxed">
                Start your IELTS preparation and begin shortlisting universities today.
              </p>
              <Link href="/session">
                <button className="w-full flex items-center justify-center gap-2 bg-white text-blue-600 font-bold py-3 rounded-xl transition-all hover:bg-blue-50 text-sm">
                  Start New Session
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
