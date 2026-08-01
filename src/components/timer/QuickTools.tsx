import { StickyNote, Layers } from 'lucide-react';

interface QuickToolsProps {
  onQuickNote: () => void;
}

export function QuickTools({ onQuickNote }: QuickToolsProps) {
  return (
    <div className="px-4 mb-6">
      <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-3">
        Learning Tools
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickNote}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-dark-800 border border-white/5
                     text-dark-300 hover:text-white hover:border-green-500/30 transition-colors"
        >
          <StickyNote size={18} />
          <span className="text-xs font-body font-semibold">Quick Notes</span>
        </button>

        <button
          disabled
          aria-disabled="true"
          title="Flashcard Review is coming soon"
          className="relative flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-dark-800 border border-white/5
                     text-dark-600 opacity-50 cursor-not-allowed"
        >
          <Layers size={18} />
          <span className="text-xs font-body font-semibold">Flashcard Review</span>
          <span className="absolute top-2 right-2 text-[9px] font-body font-bold text-dark-500 bg-dark-950 px-1.5 py-0.5 rounded">
            SOON
          </span>
        </button>
      </div>
    </div>
  );
}
