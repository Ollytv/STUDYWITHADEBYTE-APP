// src/pages/ExamPrep.tsx

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Exam, DailyByte } from '../types';
import { TodaysBytes } from '../components/TodaysBytes';
import { SyllabusProgressBar } from '../components/SyllabusProgressBar';
import { AddExamModal } from '../components/exam/AddExamModal';
import { QuizFlow } from '../components/QuizFlow';
import { setByteCompleted } from '../services/examService';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ExamPrep() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const [exams, setExams] = useState<Exam[]>([]);
  const [todaysBytes, setTodaysBytes] = useState<DailyByte[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExam, setShowAddExam] = useState(false);
  const [quizTarget, setQuizTarget] = useState<{ exam: Exam; topicId: string; topicName: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubExams = onSnapshot(collection(db, 'users', uid, 'exams'), (snap) => {
      setExams(snap.docs.map((d) => d.data() as Exam));
      setLoading(false);
    });
    return unsubExams;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'dailyBytes'), where('date', '==', todayISO()));
    const unsub = onSnapshot(q, (snap) => {
      setTodaysBytes(snap.docs.map((d) => d.data() as DailyByte));
    });
    return unsub;
  }, [uid]);

  return (
    <div className="min-h-screen bg-dark-950 pb-28">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} className="text-dark-300" />
          </button>
          <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Exam Prep
          </h1>
        </div>
        <motion.button
          onClick={() => setShowAddExam(true)}
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
          aria-label="Add exam"
        >
          <Plus size={18} className="text-green-400" />
        </motion.button>
      </div>

      <TodaysBytes
        bytes={todaysBytes}
        exams={exams}
        loading={loading}
        onToggleComplete={(byteId, completed) => setByteCompleted(byteId, completed)}
      />

      <div className="px-5">
        <h2 className="text-base font-black text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          Your Exams
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-sm text-dark-400 mb-3">No exams added yet.</p>
            <button
              onClick={() => setShowAddExam(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 border border-green-500/30 px-3 py-2 rounded-xl touch-manipulation"
            >
              <Plus size={12} /> Add your first exam
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[...exams]
              .sort((a, b) => a.examDate.localeCompare(b.examDate))
              .map((exam) => (
                <div key={exam.id} className="space-y-2">
                  <SyllabusProgressBar exam={exam} />
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {exam.topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setQuizTarget({ exam, topicId: topic.id, topicName: topic.name })}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 touch-manipulation"
                        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
                      >
                        <Sparkles size={11} />
                        {topic.name} · {topic.masteryScore}%
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <AddExamModal isOpen={showAddExam} onClose={() => setShowAddExam(false)} />

      {quizTarget && (
        <QuizFlow
          exam={quizTarget.exam}
          topicId={quizTarget.topicId}
          topicName={quizTarget.topicName}
          onClose={() => setQuizTarget(null)}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}
