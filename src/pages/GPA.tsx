import { motion } from 'framer-motion';
import { Plus, Trash2, Trophy, TrendingUp, BookOpen, ChevronLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { GPACourse, Semester, DEFAULT_CGPA_SCALE, CgpaScale } from '../types';
import { calculateGPA, getGPAClass, scoreToGrade, resolveGradePoint, normaliseGPA } from '../utils/gpa';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SemesterSwitcher } from '../components/ui/SemesterSwitcher';
import { ProgressRing } from '../components/ui/ProgressRing';

const gradeColor = (gp: number) =>
  gp >= 4 ? 'text-green-400' : gp >= 3 ? 'text-blue-400' : gp >= 2 ? 'text-yellow-400' : 'text-red-400';

function ScorePreview({ score, scale }: { score: string; scale: CgpaScale }) {
  const num = parseInt(score);
  if (!score || isNaN(num)) return null;
  const clamped = Math.max(0, Math.min(100, num));
  const { grade, gradePoint } = scoreToGrade(clamped);
  const normalisedPoint = normaliseGPA(gradePoint, scale);

  return (
    <motion.div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-display font-bold ${gradeColor(gradePoint)}`}>{grade}</span>
        <div>
          <p className="text-xs text-dark-400 font-body">Auto grade</p>
          <p className={`text-sm font-bold font-body ${gradeColor(gradePoint)}`}>
            {normalisedPoint.toFixed(1)} / {scale.toFixed(1)} pts
          </p>
        </div>
      </div>
      <div className="w-24 h-2 rounded-full bg-dark-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: gradePoint >= 4 ? '#22c55e' : gradePoint >= 3 ? '#3b82f6' : gradePoint >= 2 ? '#f97316' : '#ef4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </motion.div>
  );
}

export default function GPA() {
  const {
    gpaCourses, addGPACourse, updateGPACourse, deleteGPACourse,
    activeSemester, activeAcademicYear, setActiveTab, profile,
  } = useStore();

  // ── Resolve school scale from profile (default for existing users = 5.0) ──
  const scale: CgpaScale = profile?.cgpaScale ?? DEFAULT_CGPA_SCALE;

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GPACourse | null>(null);
  const [form, setForm] = useState({ courseName: '', courseCode: '', creditUnits: '3', score: '' });

  const derived = useMemo(() => {
    const num = parseInt(form.score);
    if (!form.score || isNaN(num)) return null;
    return scoreToGrade(Math.max(0, Math.min(100, num)));
  }, [form.score]);

  const filtered = useMemo(() =>
    gpaCourses.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear),
    [gpaCourses, activeSemester, activeAcademicYear]
  );

  // Raw GPA on 5.0 internal scale → normalised to student's school scale
  const rawGpa      = useMemo(() => calculateGPA(filtered), [filtered]);
  const gpa         = normaliseGPA(rawGpa, scale);
  const gpaClass    = getGPAClass(gpa, scale);
  const totalUnits  = filtered.reduce((s, c) => s + c.creditUnits, 0);

  const rawCgpa     = useMemo(() => calculateGPA(gpaCourses), [gpaCourses]);
  const cgpa        = normaliseGPA(rawCgpa, scale);

  const openAdd = () => {
    setEditing(null);
    setForm({ courseName: '', courseCode: '', creditUnits: '3', score: '' });
    setShowAdd(true);
  };

  const openEdit = (c: GPACourse) => {
    setEditing(c);
    setForm({
      courseName:  c.courseName,
      courseCode:  c.courseCode,
      creditUnits: String(c.creditUnits),
      score:       c.score !== undefined ? String(c.score) : '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!derived) return;
    const scoreNum = Math.max(0, Math.min(100, parseInt(form.score)));
    const data = {
      courseName:   form.courseName,
      courseCode:   form.courseCode,
      creditUnits:  parseInt(form.creditUnits) || 3,
      score:        scoreNum,
      grade:        derived.grade,
      gradePoint:   derived.gradePoint, // always stored on 5.0 scale internally
      semester:     activeSemester as Semester,
      academicYear: activeAcademicYear,
    };
    if (editing) await updateGPACourse(editing.id, data);
    else         await addGPACourse(data);
    setShowAdd(false);
  };

  const canSave = !!form.courseName.trim() && !!form.courseCode.trim() && derived !== null;

  return (
    <div className="min-h-screen bg-dark-950 pb-24">

      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('more')}
              className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">GPA Tracker</h1>
              {/* Scale shown dynamically from profile */}
              <p className="text-xs text-dark-400 font-body">{scale.toFixed(1)}-point scale · Score-based</p>
            </div>
          </div>
          <motion.button
            onClick={openAdd}
            className="w-11 h-11 rounded-2xl bg-green-500 flex items-center justify-center shadow-green-glow"
            whileTap={{ scale: 0.92 }}
          >
            <Plus size={20} className="text-dark-950" />
          </motion.button>
        </div>
      </div>

      <SemesterSwitcher />

      {/* GPA Summary */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="bg-dark-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          >
            {/* Ring percentage relative to school scale */}
            <ProgressRing percentage={(gpa / scale) * 100} size={72} strokeWidth={6} color={gpaClass.color}>
              <span className="text-base font-display font-bold text-white">{gpa.toFixed(2)}</span>
            </ProgressRing>
            <p className="text-xs font-body text-dark-400 mt-2">Semester GPA</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: gpaClass.color }}>{gpaClass.label}</p>
          </motion.div>

          <div className="space-y-3">
            <motion.div className="bg-dark-800 border border-white/5 rounded-2xl p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-xs text-dark-400 font-body">CGPA</span>
              </div>
              {/* Dynamic scale in denominator */}
              <p className="text-xl font-display font-bold text-white">
                {cgpa.toFixed(2)}<span className="text-xs text-dark-500 font-body">/{scale.toFixed(1)}</span>
              </p>
            </motion.div>
            <motion.div className="bg-dark-800 border border-white/5 rounded-2xl p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-blue-400" />
                <span className="text-xs text-dark-400 font-body">Total Units</span>
              </div>
              <p className="text-xl font-display font-bold text-white">{totalUnits}</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Course list */}
      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={28} />}
            title="No results yet"
            description="Add your course scores to calculate your GPA for this semester."
            action={{ label: 'Add a course score', onClick: openAdd }}
          />
        ) : (
          filtered.map((course, i) => {
            const gp = resolveGradePoint(course.score, course.grade);
            const normalisedGp = normaliseGPA(gp, scale);
            return (
              <motion.div
                key={course.id}
                className="bg-dark-800 border border-white/5 rounded-2xl p-4 flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="w-11 h-11 rounded-2xl bg-dark-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className={`text-base font-display font-bold leading-none ${gradeColor(gp)}`}>
                    {course.grade}
                  </span>
                  {course.score !== undefined && (
                    <span className="text-[9px] text-dark-500 font-body leading-none mt-0.5">
                      {course.score}%
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-white truncate">{course.courseName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-dark-400">{course.courseCode}</span>
                    <span className="text-dark-600">•</span>
                    <span className="text-xs text-dark-400">{course.creditUnits} units</span>
                    <span className="text-dark-600">•</span>
                    {/* Grade point shown on student's school scale */}
                    <span className={`text-xs font-semibold ${gradeColor(gp)}`}>
                      {normalisedGp.toFixed(1)} pts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(course)} className="p-2 rounded-xl hover:bg-white/8 text-dark-500 hover:text-white transition-colors">
                    <TrendingUp size={14} />
                  </button>
                  <button onClick={() => deleteGPACourse(course.id)} className="p-2 rounded-xl hover:bg-red-500/10 text-dark-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editing ? 'Edit Course' : 'Add Course'}>
        <div className="p-5 space-y-4 pb-10">
          <Input
            label="Course Name"
            value={form.courseName}
            onChange={v => setForm(f => ({ ...f, courseName: v }))}
            placeholder="e.g. Data Structures"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" value={form.courseCode}
              onChange={v => setForm(f => ({ ...f, courseCode: v }))} placeholder="e.g. CSC201" />
            <Input label="Credit Units" type="number" value={form.creditUnits}
              onChange={v => setForm(f => ({ ...f, creditUnits: v }))} placeholder="3" />
          </div>
          <Input
            label="Score (0 – 100)"
            type="number"
            value={form.score}
            onChange={v => {
              const n = parseInt(v);
              if (v === '') { setForm(f => ({ ...f, score: '' })); return; }
              setForm(f => ({ ...f, score: String(Math.max(0, Math.min(100, isNaN(n) ? 0 : n))) }));
            }}
            placeholder="e.g. 74"
            required
            hint="Grade is calculated automatically from your score"
          />
          <ScorePreview score={form.score} scale={scale} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSave} disabled={!canSave}>
              {editing ? 'Update' : 'Add Course'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}