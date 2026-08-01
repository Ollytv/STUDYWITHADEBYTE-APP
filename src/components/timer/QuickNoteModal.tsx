import { useState } from 'react';
import { X } from 'lucide-react';

interface QuickNoteModalProps {
  isOpen: boolean;
  subjectLabel?: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function QuickNoteModal({ isOpen, subjectLabel, onClose, onSave }: QuickNoteModalProps) {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setText('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-note-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-dark-800 border border-white/8 rounded-2xl p-4 mb-4 sm:mb-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="quick-note-title" className="text-sm font-display font-bold text-white">
            Quick Note{subjectLabel ? ` — ${subjectLabel}` : ''}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Jot down a quick thought before it slips away..."
          rows={4}
          className="w-full bg-dark-950 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-body text-white
                     placeholder:text-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-body font-semibold text-dark-400 bg-dark-950 border border-white/8"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-body font-semibold text-dark-950 bg-green-500 disabled:opacity-40"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
