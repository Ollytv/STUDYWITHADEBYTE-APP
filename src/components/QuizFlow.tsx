// src/components/QuizFlow.tsx
//
// No question bank or generation service exists yet for exam topics, so
// there's no real content to hand QuizSubmission.tsx. This wraps it with a
// quick self-authoring step: the student writes a handful of recall
// questions for the topic, then answers them immediately — active recall,
// with the "quiz" written by the person taking it. QuizSubmission itself
// (score → submitQuizAttempt → mastery/schedule update) is untouched.

import { useState, FormEvent } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Exam } from '../types';
import { QuizSubmission } from './QuizSubmission';

interface QuizFlowProps {
  exam: Exam;
  topicId: string;
  topicName: string;
  onClose: () => void;
  onComplete: (score: number) => void;
}

interface DraftQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

function newDraftQuestion(id: string): DraftQuestion {
  return { id, prompt: '', choices: ['', ''], correctIndex: 0 };
}

export function QuizFlow({ exam, topicId, topicName, onClose, onComplete }: QuizFlowProps) {
  const [phase, setPhase] = useState<'author' | 'quiz'>('author');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([newDraftQuestion(crypto.randomUUID())]);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<DraftQuestion>) {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }

  function updateChoice(id: string, index: number, value: string) {
    setDrafts(prev => prev.map(d =>
      d.id === id ? { ...d, choices: d.choices.map((c, i) => (i === index ? value : c)) } : d
    ));
  }

  function addChoice(id: string) {
    setDrafts(prev => prev.map(d =>
      d.id === id && d.choices.length < 5 ? { ...d, choices: [...d.choices, ''] } : d
    ));
  }

  function removeChoice(id: string, index: number) {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id || d.choices.length <= 2) return d;
      const choices = d.choices.filter((_, i) => i !== index);
      const correctIndex = d.correctIndex >= choices.length ? 0 : d.correctIndex;
      return { ...d, choices, correctIndex };
    }));
  }

  function addQuestion() {
    if (drafts.length >= 5) return;
    setDrafts(prev => [...prev, newDraftQuestion(crypto.randomUUID())]);
  }

  function removeQuestion(id: string) {
    setDrafts(prev => (prev.length > 1 ? prev.filter(d => d.id !== id) : prev));
  }

  function handleStartQuiz(e: FormEvent) {
    e.preventDefault();
    const cleaned = drafts.map(d => ({
      ...d,
      prompt: d.prompt.trim(),
      choices: d.choices.map(c => c.trim()),
    }));
    const invalid = cleaned.some(d => !d.prompt || d.choices.some(c => !c) || d.choices.length < 2);
    if (invalid) {
      setError('Fill in every question and all its choices (at least 2 each).');
      return;
    }
    setDrafts(cleaned);
    setError(null);
    setPhase('quiz');
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(5,8,10,0.75)' }} onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>
            {phase === 'author' ? `Quick Check: ${topicName}` : `${topicName} Quiz`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label="Close"
          >
            <X size={14} className="text-dark-400" />
          </button>
        </div>

        {phase === 'author' ? (
          <form onSubmit={handleStartQuiz} className="space-y-4">
            <p className="text-xs text-dark-400">
              Write a few recall questions for yourself, then answer them right away — active recall beats re-reading notes.
            </p>

            {drafts.map((d, qIndex) => (
              <div
                key={d.id}
                className="rounded-2xl p-3.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-dark-400">Question {qIndex + 1}</p>
                  {drafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(d.id)}
                      aria-label={`Remove question ${qIndex + 1}`}
                    >
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={d.prompt}
                  onChange={(e) => updateDraft(d.id, { prompt: e.target.value })}
                  placeholder="Question prompt"
                  className="w-full rounded-xl px-3 py-2 text-sm text-white mb-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <div className="space-y-1.5">
                  {d.choices.map((choice, cIndex) => (
                    <div key={cIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${d.id}`}
                        checked={d.correctIndex === cIndex}
                        onChange={() => updateDraft(d.id, { correctIndex: cIndex })}
                        aria-label={`Mark choice ${cIndex + 1} correct`}
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => updateChoice(d.id, cIndex, e.target.value)}
                        placeholder={`Choice ${cIndex + 1}`}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      />
                      {d.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeChoice(d.id, cIndex)}
                          aria-label={`Remove choice ${cIndex + 1}`}
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {d.choices.length < 5 && (
                  <button
                    type="button"
                    onClick={() => addChoice(d.id)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-green-400"
                  >
                    <Plus size={11} /> Add choice
                  </button>
                )}
              </div>
            ))}

            {drafts.length < 5 && (
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs font-semibold text-green-400"
              >
                <Plus size={12} /> Add question
              </button>
            )}

            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl py-3 text-sm font-bold text-dark-950"
              style={{ background: '#4ade80' }}
            >
              Start Quiz
            </button>
          </form>
        ) : (
          <QuizSubmission
            exam={exam}
            topicId={topicId}
            questions={drafts}
            onComplete={(score) => { onComplete(score); onClose(); }}
          />
        )}
      </div>
    </div>
  );
}
