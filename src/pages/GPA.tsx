import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Trophy, TrendingUp, BookOpen, ChevronLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { GPACourse, Semester } from '../types';
import { calculateGPA, getGPAClass, GRADE_OPTIONS, GRADE_POINTS } from '../utils/gpa';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SemesterSwitcher } from '../components/ui/SemesterSwitcher';
import { ProgressRing } from '../components/ui/ProgressRing';

export default function GPA() {
  const { gpaCourses, addGPACourse, updateGPACourse, deleteGPACourse, activeSemester, activeAcademicYear, setActiveTab } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GPACourse | null>(null);
  const [form, setForm] = useState({ courseName: '', courseCode: '', creditUnits: '3', grade: 'B' });

  const filtered = useMemo(() => gpaCourses.filter(
    c => c.semester === activeSemester && c.academicYear === activeAcademicYear
  ), [gpaCourses, activeSemester, activeAcademicYear]);

  const gpa = useMemo(() => calculateGPA(filtered), [filtered]);
  const gpaClass = getGPAClass(gpa);
  const totalUnits = filtered.reduce((s, c) => s + c.creditUnits, 0);
  const cgpa = useMemo(() => calculateGPA(gpaCourses), [gpaCourses]);

  const openAdd = () => {
    setEditing(null);
    setForm({ courseName: '', courseCode: '', creditUnits: '3', grade: 'B' });
    setShowAdd(true);
  };
  const openEdit = (c: GPACourse) => {
    setEditing(c);
    setForm({ courseName: c.courseName, courseCode: c.courseCode, creditUnits: String(c.creditUnits), grade: c.grade });
    setShowAdd(true);
  };

  const handleSave = async () => {
    const data = {
      courseName: form.courseName, courseCode: form.courseCode,
      creditUnits: parseInt(form.creditUnits) || 3,
      grade: form.grade, gradePoint: GRADE_POINTS[form.grade] ?? 0,
      semester: activeSemester as Semester, academicYear: activeAcademicYear,
    };
    if (editing) await updateGPACourse(editing.id, data);
    else await addGPACourse(data);
    setShowAdd(false);
  };

  const gradeColor = (gp: number) =>
    gp >= 4 ? 'text-green-400' : gp >= 3 ? 'text-blue-400' : gp >= 2 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {/* Back to More */}
            <button
              onClick={() => setActiveTab('more')}
              className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">GPA Tracker</h1>
              <p className="text-xs text-dark-400 font-body">POLYIBADAN 5-point scale</p>
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

      {/* GPA Summary cards */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="bg-dark-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          >
            <ProgressRing percentage={(gpa / 3) * 100} size={72} strokeWidth={6} color={gpaClass.color}>
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
              <p className="text-xl font-display font-bold text-white">{cgpa.toFixed(2)}<span className="text-xs text-dark-500 font-body">/3.0</span></p>
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

      {/* Courses list */}
      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={28} />}
            title="No results yet"
            description="Add your course grades to calculate your GPA for this semester."
            action={{ label: 'Add a course grade', onClick: openAdd }}
          />
        ) : (
          filtered.map((course, i) => (
            <motion.div
              key={course.id}
              className="bg-dark-800 border border-white/5 rounded-2xl p-4 flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="w-11 h-11 rounded-2xl bg-dark-700 flex items-center justify-center flex-shrink-0">
                <span className={`text-lg font-display font-bold ${gradeColor(course.gradePoint)}`}>{course.grade}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-white truncate">{course.courseName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-dark-400">{course.courseCode}</span>
                  <span className="text-dark-600">•</span>
                  <span className="text-xs text-dark-400">{course.creditUnits} units</span>
                  <span className="text-dark-600">•</span>
                  <span className={`text-xs font-semibold ${gradeColor(course.gradePoint)}`}>{course.gradePoint} pts</span>
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
          ))
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editing ? 'Edit Course Grade' : 'Add Course Grade'}>
        <div className="p-5 space-y-4 pb-10">
          <Input label="Course Name" value={form.courseName} onChange={v => setForm(f => ({ ...f, courseName: v }))} placeholder="e.g. Data Structures" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" value={form.courseCode} onChange={v => setForm(f => ({ ...f, courseCode: v }))} placeholder="e.g. CSC201" />
            <Input label="Credit Units" type="number" value={form.creditUnits} onChange={v => setForm(f => ({ ...f, creditUnits: v }))} placeholder="3" />
          </div>
          <Select label="Grade" value={form.grade} onChange={v => setForm(f => ({ ...f, grade: v }))} options={GRADE_OPTIONS} />
          {form.grade && (
            <div className="p-3 bg-dark-700 rounded-xl text-sm font-body text-dark-300">
              Grade Point: <span className={`font-bold ${gradeColor(GRADE_POINTS[form.grade] ?? 0)}`}>{GRADE_POINTS[form.grade]?.toFixed(1)}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSave} disabled={!form.courseName || !form.courseCode}>
              {editing ? 'Update' : 'Add Course'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}