// src/components/QuizSubmission.tsx

import { useState } from 'react';
import { Exam } from '../types';
import { submitQuizAttempt } from '../services/examService';

interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

interface QuizSubmissionProps {
  exam: Exam;
  topicId: string;
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export function QuizSubmission({ exam, topicId, questions, onComplete }: QuizSubmissionProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!allAnswered) return;

    const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
    const score = Math.round((correct / questions.length) * 100);

    setSubmitting(true);
    setError(null);
    try {
      await submitQuizAttempt(exam, topicId, score);
      onComplete(score);
    } catch {
      setError('Could not submit quiz. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const topicName = exam.topics.find((t) => t.id === topicId)?.name ?? 'Topic';

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-neutral-100">{topicName} Quiz</h2>

      {questions.map((q, qIndex) => (
        <fieldset key={q.id} className="rounded-lg bg-neutral-900 p-4">
          <legend className="mb-2 text-sm font-medium text-neutral-200">
            {qIndex + 1}. {q.prompt}
          </legend>
          <div className="space-y-2">
            {q.choices.map((choice, choiceIndex) => (
              <label
                key={choiceIndex}
                className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300"
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === choiceIndex}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: choiceIndex }))}
                  className="accent-emerald-500"
                />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Quiz'}
      </button>
    </div>
  );
}
