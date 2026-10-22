import { useState, FormEvent } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Flashcard, FLASHCARD_LIMITS } from '../../types';
import { normaliseDeckName } from '../../utils/flashcards';
import { inputStyle, labelClass } from './fieldStyles';

export interface CardFormData { deck: string; front: string; back: string }

/** Add a card by hand, or edit an existing one (scheduling state is never touched here). */
export default function CardEditorSheet({ initial, decks, defaultDeck, onClose, onSave }: {
  initial?: Flashcard;
  decks: string[];
  defaultDeck: string;
  onClose: () => void;
  onSave: (data: CardFormData) => void;
}) {
  const [deck, setDeck]   = useState(initial?.deck ?? defaultDeck);
  const [front, setFront] = useState(initial?.front ?? '');
  const [back, setBack]   = useState(initial?.back ?? '');
  const [error, setError] = useState('');

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!front.trim()) return setError('Write the question for the front of the card.');
    if (!back.trim())  return setError('Write the answer for the back of the card.');
    onSave({ deck: normaliseDeckName(deck), front: front.trim(), back: back.trim() });
  };

  return (
    <BottomSheet title={initial ? 'Edit card' : 'New card'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className={labelClass}>Deck</p>
          <input list="flashcard-deck-options" value={deck} maxLength={FLASHCARD_LIMITS.deck}
            onChange={e => setDeck(e.target.value)} placeholder="e.g. BIO101"
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none" style={inputStyle} aria-label="Deck" />
          <datalist id="flashcard-deck-options">{decks.map(d => <option key={d} value={d} />)}</datalist>
        </div>

        <div>
          <p className={labelClass}>Front (question)</p>
          <textarea autoFocus rows={3} value={front} maxLength={FLASHCARD_LIMITS.front}
            onChange={e => { setFront(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none resize-none" style={inputStyle} aria-label="Front of card" />
        </div>

        <div>
          <p className={labelClass}>Back (answer)</p>
          <textarea rows={4} value={back} maxLength={FLASHCARD_LIMITS.back}
            onChange={e => { setBack(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none resize-none" style={inputStyle} aria-label="Back of card" />
        </div>

        {error && <p role="alert" className="text-xs font-semibold" style={{ color: '#f87171' }}>{error}</p>}
        <button type="submit" className="w-full py-3.5 rounded-2xl text-sm font-black touch-manipulation"
          style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
          {initial ? 'Save changes' : 'Add card'}
        </button>
      </form>
    </BottomSheet>
  );
}
