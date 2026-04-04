'use client';
import { motion } from 'framer-motion';
import { MapPin, Clock, TrendingUp } from 'lucide-react';

interface UniversityCardProps {
  name: string;
  country: string;
  flag: string;
  tuition: string;
  ranking: string;
  course: string;
  match: number;
  deadline: string;
  tag: string;
  tagColor: string;
  delay?: number;
}

const tagStyles: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  gray: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function UniversityCard({
  name, country, flag, tuition, ranking, course, match, deadline, tag, tagColor, delay = 0
}: UniversityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">{name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">{country}</span>
            </div>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tagStyles[tagColor] || tagStyles.gray}`}>
          {tag}
        </span>
      </div>

      {/* Course */}
      <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs text-blue-600 font-medium">{course}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center bg-slate-50 rounded-lg p-2">
          <p className="text-xs text-slate-500">Tuition</p>
          <p className="text-sm font-semibold text-slate-700">{tuition}</p>
        </div>
        <div className="text-center bg-slate-50 rounded-lg p-2">
          <p className="text-xs text-slate-500">Ranking</p>
          <p className="text-sm font-semibold text-slate-700">{ranking}</p>
        </div>
      </div>

      {/* Match score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-slate-500">Match Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${match}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <span className="text-xs font-bold text-blue-600">{match}%</span>
        </div>
      </div>

      {/* Deadline */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-500">Deadline: <span className="font-medium text-slate-700">{deadline}</span></span>
      </div>
    </motion.div>
  );
}
