// src/components/exam/AddExamModal.tsx

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../hooks/useStore';
import { createExam } from '../../services/examService';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddExamModal({ isOpen, onClose }: AddExamModalProps) {
  const { activeSemester, activeAcademicYear } = useStore();

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(20);
  const [topics, setTopics] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTopic(index: number, value: string) {
    setTopics((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addTopicField() {
    setTopics((prev) => [...prev, '']);
  }

  function removeTopicField(index: number) {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setCourseCode('');
    setCourseName('');
    setExamDate('');
    setTargetDailyMinutes(20);
    setTopics(['']);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cleanTopics = topics.map((t) => t.trim()).filter(Boolean);
    if (!courseCode.trim() || !courseName.trim() || !examDate || cleanTopics.length === 0) {
      setError('Fill in course details and at least one topic.');
      return;
    }
    if (new Date(examDate) <= new Date()) {
      setError('Exam date must be in the future.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createExam({
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim(),
        examDate,
        targetDailyMinutes,
        topicNames: cleanTopics,
        semester: activeSemester,
        academicYear: activeAcademicYear,
      });
      resetForm();
      onClose();
    } catch {
      setError('Could not save exam. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(5,8,10,0.75)' }}
            onClick={submitting ? undefined : onClose}
          />

          <motion.form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exam-heading"
            className="relative w-full sm:max-w-sm max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 pb-safe"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="add-exam-heading" className="text-lg font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Add Exam
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                aria-label="Close"
              >
                <X size={14} className="text-dark-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="text-xs text-dark-400">
                  Course Code
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="BIO201"
                    required
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </label>
                <label className="text-xs text-dark-400">
                  Exam Date
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </label>
              </div>

              <label className="block text-xs text-dark-400">
                Course Name
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Cell Biology"
                  required
                  className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </label>

              <label className="block text-xs text-dark-400">
                Target daily study minutes
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={targetDailyMinutes}
                  onChange={(e) => setTargetDailyMinutes(Number(e.target.value))}
                  required
                  className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </label>

              <div>
                <p className="text-xs text-dark-400 mb-1.5">Topics / Modules</p>
                <div className="space-y-2">
                  {topics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => updateTopic(i, e.target.value)}
                        placeholder={`Topic ${i + 1}`}
                        className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      {topics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTopicField(i)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(248,113,113,0.1)' }}
                          aria-label={`Remove topic ${i + 1}`}
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTopicField}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-400"
                >
                  <Plus size={12} /> Add topic
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-dark-950 disabled:opacity-50 touch-manipulation"
              style={{ background: '#4ade80' }}
            >
              {submitting ? 'Creating…' : 'Create Study Plan'}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
