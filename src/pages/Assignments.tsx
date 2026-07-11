import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle, Clock, BookOpen, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { Assignment } from '../types';
import { Modal } from '../components/ui/Modal';
import { Input, Select, TextArea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SemesterSwitcher } from '../components/ui/SemesterSwitcher';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

type Filter = 'all' | 'pending' | 'completed' | 'overdue';

const PRIORITY_CONFIG = {
  high:   { color: 'text-red-400',    bg: 'bg-red-500/12',    border: 'border-red-500/25',    dot: 'bg-red-500',    label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/12', border: 'border-yellow-500/25', dot: 'bg-yellow-500', label: 'Medium' },
  low:    { color: 'text-green-400',  bg: 'bg-green-500/12',  border: 'border-green-500/25',  dot: 'bg-green-500',  label: 'Low' },
};

function daysUntil(deadline: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(deadline); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineChip({ deadline, completed }: { deadline: string; completed: boolean }) {
  if (completed) return <span className="text-xs text-green-400 font-body">✓ Done</span>;
  const days = daysUntil(deadline);
  if (days < 0)  return <span className="text-xs text-red-400 font-body font-semibold">Overdue {Math.abs(days)}d</span>;
  if (days === 0) return <span className="text-xs text-orange-400 font-body font-semibold">Due today</span>;
  if (days === 1) return <span className="text-xs text-yellow-400 font-body font-semibold">Due tomorrow</span>;
  return <span className="text-xs text-dark-400 font-body">Due in {days}d</span>;
}

export default function Assignments() {
  const { assignments, addAssignment, deleteAssignment, toggleAssignment, activeSemester, activeAcademicYear, classes } = useStore();
  const navigate = useNavigate();
 const [showAdd, setShowAdd] = useState(false);
const [filter, setFilter] = useState<Filter>('all'); // ← ADD THIS: was missing, caused both errors
const [form, setForm] = useState({ title: '', courseCode: '', courseName: '', deadline: '', priority: 'medium' as Assignment['priority'], description: '' });
  const courseOptions = useMemo(() => {
    const unique = new Map<string, string>();
    classes.forEach(c => unique.set(c.courseCode, c.courseName));
    return [{ value: '', label: 'Select course...' }, ...Array.from(unique).map(([code, name]) => ({ value: code, label: `${code} – ${name}` }))];
  }, [classes]);

  const filtered = useMemo(() => {
    let list = assignments.filter(a => a.semester === activeSemester && a.academicYear === activeAcademicYear);
    if (filter === 'pending')   list = list.filter(a => !a.completed && daysUntil(a.deadline) >= 0);
    if (filter === 'completed') list = list.filter(a => a.completed);
    if (filter === 'overdue')   list = list.filter(a => !a.completed && daysUntil(a.deadline) < 0);
    return list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [assignments, filter, activeSemester, activeAcademicYear]);

  const counts = useMemo(() => {
    const list = assignments.filter(a => a.semester === activeSemester && a.academicYear === activeAcademicYear);
    return {
      all:       list.length,
      pending:   list.filter(a => !a.completed && daysUntil(a.deadline) >= 0).length,
      completed: list.filter(a => a.completed).length,
      overdue:   list.filter(a => !a.completed && daysUntil(a.deadline) < 0).length,
    };
  }, [assignments, activeSemester, activeAcademicYear]);

  // In Assignments.tsx handleSave:
const handleSave = async () => {
  if (!form.title.trim() || !form.deadline) return;
  if (form.title.length > 200) return;          // ← add length guard
  if (form.description.length > 1000) return;   // ← add length guard
  // ...
};

// In the Input component (src/components/ui/Input.tsx) — add maxLength prop:
<input
  maxLength={200}   // enforce at HTML level too
  // ...
/>

// Recommended limits:
// Course name:    100 chars
// Course code:    20 chars
// Assignment title: 200 chars
// Description:    1000 chars
// Note content:   5000 chars
// Venue:          100 chars
// Lecturer:       100 chars
// Link URL:       2000 chars (RFC 2616)

  const handleCourseSelect = (code: string) => {
    const c = classes.find(c => c.courseCode === code);
    setForm(f => ({ ...f, courseCode: code, courseName: c?.courseName || '' }));
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'rgba(10,10,15,0.92)' }}>
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.app.more)}
              className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Assignments</h1>
              <p className="text-xs text-dark-400 font-body">{counts.pending} pending · {counts.overdue} overdue</p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowAdd(true)}
            className="w-11 h-11 rounded-2xl bg-green-500 flex items-center justify-center shadow-green-glow"
            whileTap={{ scale: 0.92 }}
          >
            <Plus size={20} className="text-dark-950" />
          </motion.button>
        </div>
      </div>

      <SemesterSwitcher />

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
        {([['all', 'All'], ['pending', 'Pending'], ['overdue', 'Overdue'], ['completed', 'Done']] as [Filter, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-body font-semibold border transition-all flex items-center gap-1.5 ${
              filter === id ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-dark-800 border-white/5 text-dark-500'
            }`}
          >
            {id === 'overdue' && counts.overdue > 0 && <AlertTriangle size={10} />}
            {label}
            <span className={filter === id ? 'text-green-500' : 'text-dark-600'}>({counts[id]})</span>
          </button>
        ))}
      </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title={filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
            description="Keep track of all your deadlines in one place."
            action={filter === 'all' ? { label: 'Add assignment', onClick: () => setShowAdd(true) } : undefined}
          />
        ) : (
          filtered.map((a, i) => {
            const p = PRIORITY_CONFIG[a.priority];
            const days = daysUntil(a.deadline);
            return (
              <motion.div
                key={a.id}
                className={`bg-dark-800 border rounded-2xl p-4 ${a.completed ? 'opacity-60 border-white/5' : days < 0 ? 'border-red-500/20' : days <= 1 ? 'border-yellow-500/20' : 'border-white/5'}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleAssignment(a.id)} className="mt-0.5 flex-shrink-0">
                    {a.completed
                      ? <CheckCircle2 size={20} className="text-green-400" />
                      : <Circle size={20} className="text-dark-500 hover:text-white transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-display font-semibold ${a.completed ? 'line-through text-dark-400' : 'text-white'}`}>{a.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {a.courseCode && <span className="text-xs font-mono text-dark-400">{a.courseCode}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-lg border ${p.bg} ${p.color} ${p.border} flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-dark-500">
                        <Clock size={10} />
                        <DeadlineChip deadline={a.deadline} completed={a.completed} />
                      </span>
                    </div>
                    {a.description && <p className="text-xs text-dark-500 mt-1.5 line-clamp-2">{a.description}</p>}
                  </div>
                  <button onClick={() => deleteAssignment(a.id)} className="p-1.5 rounded-xl hover:bg-red-500/10 text-dark-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Assignment">
        <div className="p-5 space-y-4 pb-10">
          <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Submit Lab Report" required />
          <Select label="Course" value={form.courseCode} onChange={handleCourseSelect} options={courseOptions} />
          <Input label="Deadline" type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} required />
          <Select label="Priority" value={form.priority}
            onChange={v => setForm(f => ({ ...f, priority: v as Assignment['priority'] }))}
            options={[{ value: 'high', label: '🔴 High' }, { value: 'medium', label: '🟡 Medium' }, { value: 'low', label: '🟢 Low' }]}
          />
          <TextArea label="Description (Optional)" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Details about the assignment..." rows={2} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSave} disabled={!form.title || !form.deadline}>Add Assignment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}