'use client';
import { motion } from 'framer-motion';
import { kanbanTasks } from '@/lib/mockData';

type Column = 'to-start' | 'in-progress' | 'completed';

const colConfig: Record<Column, { label: string; dotColor: string; labelColor: string; countBg: string; countColor: string }> = {
  'to-start':   { label: 'To Start',    dotColor: '#94a3b8', labelColor: '#475569', countBg: '#f1f5f9', countColor: '#475569' },
  'in-progress':{ label: 'In Progress', dotColor: '#2563eb', labelColor: '#1d4ed8', countBg: '#eff6ff', countColor: '#1d4ed8' },
  completed:    { label: 'Completed',   dotColor: '#16a34a', labelColor: '#15803d', countBg: '#f0fdf4', countColor: '#15803d' },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  High:   { bg: '#fef2f2', text: '#dc2626' },
  Medium: { bg: '#fffbeb', text: '#b45309' },
  Low:    { bg: '#f8fafc', text: '#475569' },
  Done:   { bg: '#f0fdf4', text: '#16a34a' },
};

export default function KanbanBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px 28px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Journey Tracker</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Track your study abroad application steps</p>
        </div>
        <button style={{
          fontSize: '12px', fontWeight: 600, color: '#2563eb',
          background: '#eff6ff', border: 'none', borderRadius: '8px',
          padding: '8px 14px', cursor: 'pointer',
        }}>
          + Add Task
        </button>
      </div>

      {/* 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {(Object.keys(colConfig) as Column[]).map(colKey => {
          const cfg = colConfig[colKey];
          const tasks = kanbanTasks[colKey];

          return (
            <div key={colKey}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dotColor }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.labelColor }}>{cfg.label}</span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: cfg.countBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.countColor }}>{tasks.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '80px' }}>
                {tasks.map((task, i) => {
                  const pc = priorityColors[task.priority] || priorityColors.Low;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="kanban-card"
                      style={{ opacity: colKey === 'completed' ? 0.65 : 1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{task.icon}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>···</span>
                      </div>
                      <p style={{
                        fontSize: '13px', fontWeight: 600, color: '#334155',
                        margin: '0 0 10px',
                        textDecoration: colKey === 'completed' ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 600,
                          background: pc.bg, color: pc.text,
                          padding: '3px 8px', borderRadius: '999px',
                        }}>
                          {task.priority}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{task.dueDate}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
