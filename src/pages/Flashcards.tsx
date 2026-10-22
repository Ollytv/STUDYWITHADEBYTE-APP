import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Plus, Trash2, Pencil, X, AlertTriangle, Layers, Flame, Trophy, ChevronRight } from 'lucide-react';
import { ROUTES } from '../routes';
import { useStore } from '../hooks/useStore';
import { useFlashcards } from '../hooks/useFlashcards';
import { getFriendlyError } from '../services/db';
import { generateId } from '../utils/id';
import { Flashcard, FlashcardGrade } from '../types';
import {
  DEFAULT_EASE, buildQueue, cardStatus, dueLabel, effectiveStreak, groupDecks, todayISO,
} from '../utils/flashcards';
import StudySession from '../components/flashcards/StudySession';
import GenerateSheet, { NoteSource } from '../components/flashcards/GenerateSheet';
import CardEditorSheet, { CardFormData } from '../components/flashcards/CardEditorSheet';

type View = 'hub' | 'deck' | 'session';

const STATUS_STYLE = {
  new:      { label: 'New',      color: '#60a5fa' },
  learning: { label: 'Learning', color: '#fbbf24' },
  mastered: { label: 'Mastered', color: '#22c55e' },
} as const;

const surface = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' } as const;

export default function Flashcards() {
  const navigate = useNavigate();
  const materials = useStore(s => s.materials);
  const { cards, stats, loading, error, retry, gradeCard, saveCard, saveCards, removeCard, removeMany } = useFlashcards();

  const [view, setView]               = useState<View>('hub');
  const [returnView, setReturnView]   = useState<View>('hub');
  const [activeDeck, setActiveDeck]   = useState('');
  const [queueIds, setQueueIds]       = useState<string[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editor, setEditor]           = useState<{ card?: Flashcard } | null>(null);
  const [confirmCard, setConfirmCard] = useState<string | null>(null);
  const [confirmDeck, setConfirmDeck] = useState(false);
  const [notice, setNotice]           = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const today   = todayISO();
  const decks   = useMemo(() => groupDecks(cards, today), [cards, today]);
  const deckNames = useMemo(() => decks.map(d => d.deck), [decks]);
  const streak  = effectiveStreak(stats, today);
  const dueTotal = decks.reduce((s, d) => s + d.due, 0);
  const masteredTotal = decks.reduce((s, d) => s + d.mastered, 0);

  const noteSources: NoteSource[] = useMemo(
    () => (materials ?? [])
      .filter(m => m.type === 'note' && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => ({ id: m.id, title: m.name, courseCode: m.courseCode, content: m.content })),
    [materials]
  );

  const deckCards = useMemo(
    () => cards.filter(c => c.deck === activeDeck).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [cards, activeDeck]
  );
  const activeSummary = decks.find(d => d.deck === activeDeck);

  // Success notices fade on their own; errors stay until dismissed.
  useEffect(() => {
    if (notice?.type !== 'ok') return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const fail = (err: unknown) => setNotice({ type: 'error', text: `${getFriendlyError(err)} Your last change may not have been saved.` });

  const startSession = (deck?: string) => {
    const ids = buildQueue(deck ? cards.filter(c => c.deck === deck) : cards, today);
    if (ids.length === 0) return;
    setQueueIds(ids);
    setReturnView(view === 'deck' ? 'deck' : 'hub');
    setView('session');
  };

  const handleGrade = (card: Flashcard, grade: FlashcardGrade) => { gradeCard(card, grade).catch(fail); };

  const handleEditorSave = (data: CardFormData) => {
    const editing = editor?.card;
    setEditor(null);
    const card: Flashcard = editing
      ? { ...editing, ...data }
      : {
          id: generateId(), ...data, dueDate: today, intervalDays: 0, ease: DEFAULT_EASE,
          reps: 0, lapses: 0, createdAt: new Date().toISOString(),
        };
    saveCard(card).catch(fail);
    if (!editing) { setActiveDeck(data.deck); setView('deck'); }
  };

  const handleGenerated = (fresh: Flashcard[], skipped: number) => {
    setShowGenerate(false);
    if (fresh.length === 0) {
      setNotice({ type: 'ok', text: 'Those cards already exist in the deck, so nothing was added.' });
      return;
    }
    saveCards(fresh).catch(fail);
    setActiveDeck(fresh[0].deck);
    setView('deck');
    setNotice({
      type: 'ok',
      text: `Added ${fresh.length} ${fresh.length === 1 ? 'card' : 'cards'} to ${fresh[0].deck}${skipped ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)` : ''}.`,
    });
  };

  const handleDeleteCard = (id: string) => { setConfirmCard(null); removeCard(id).catch(fail); };
  const handleDeleteDeck = () => {
    setConfirmDeck(false);
    const ids = deckCards.map(c => c.id);
    setView('hub');
    removeMany(ids).catch(fail);
  };

  // ── Review session ──
  if (view === 'session') {
    return <StudySession cards={cards} queueIds={queueIds} streak={streak} onGrade={handleGrade} onExit={() => setView(returnView)} />;
  }

  const inDeck = view === 'deck';

  return (
    <div className="min-h-screen bg-surface-base pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'var(--nav-bg)' }}>
        <div className="px-5 pt-14 pb-4 flex items-center gap-3">
          <button onClick={() => (inDeck ? setView('hub') : navigate(ROUTES.app.more))} aria-label="Back"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-content-secondary flex-shrink-0 touch-manipulation"
            style={surface}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-content-primary truncate" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
              {inDeck ? activeDeck : 'Smart Flashcards'}
            </h1>
            <p className="text-xs text-content-secondary">
              {inDeck ? (activeSummary ? `${activeSummary.total} cards · ${activeSummary.due} due today` : 'No cards yet') : 'Remember more, review less'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {notice && (
          <div role={notice.type === 'error' ? 'alert' : 'status'} className="rounded-2xl p-3.5 flex items-start gap-2.5"
            style={notice.type === 'error'
              ? { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }
              : { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            {notice.type === 'error' && <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />}
            <p className="text-xs text-content-primary flex-1">{notice.text}</p>
            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="text-content-muted"><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading flashcards">
            {[90, 120, 120].map((h, i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, ...surface }} />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl p-6 text-center" style={surface}>
            <p className="text-sm font-bold text-content-primary mb-1">Couldn't load your flashcards</p>
            <p className="text-xs text-content-secondary mb-4">{error}</p>
            <button onClick={retry} className="px-5 py-2.5 rounded-xl text-sm font-black touch-manipulation"
              style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>Try again</button>
          </div>
        ) : inDeck ? (
          /* ── Deck view ── */
          <>
            <div className="flex gap-3">
              <button onClick={() => startSession(activeDeck)} disabled={!activeSummary?.due}
                className="flex-1 py-3.5 rounded-2xl text-sm font-black touch-manipulation disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
                {activeSummary?.due ? `Study ${activeSummary.due} due` : deckCards.length ? 'All caught up' : 'No cards yet'}
              </button>
              <button onClick={() => setEditor({})} aria-label="Add card"
                className="w-12 rounded-2xl flex items-center justify-center text-content-primary touch-manipulation" style={surface}>
                <Plus size={20} />
              </button>
              <button onClick={() => setShowGenerate(true)} aria-label="Generate more cards from notes"
                className="w-12 rounded-2xl flex items-center justify-center text-green-500 touch-manipulation" style={surface}>
                <Sparkles size={18} />
              </button>
            </div>

            {deckCards.length === 0 && (
              <p className="text-sm text-content-secondary text-center py-6">This deck is empty. Add a card or generate some from your notes.</p>
            )}
            <div className="rounded-2xl overflow-hidden" style={deckCards.length ? surface : undefined}>
              {deckCards.map((c, i) => {
                const st = STATUS_STYLE[cardStatus(c)];
                const confirming = confirmCard === c.id;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3" style={i > 0 ? { borderTop: '1px solid var(--border-color)' } : undefined}>
                    <button onClick={() => setEditor({ card: c })} className="flex-1 min-w-0 text-left touch-manipulation" aria-label={`Edit card: ${c.front}`}>
                      <p className="text-sm font-semibold text-content-primary line-clamp-2 whitespace-pre-wrap">{c.front}</p>
                      <p className="text-xs text-content-muted truncate mt-0.5">{c.back}</p>
                      <p className="text-[11px] font-bold mt-1.5">
                        <span style={{ color: st.color }}>{st.label}</span>
                        <span className="text-content-muted"> · {dueLabel(c, today)}</span>
                      </p>
                    </button>
                    {confirming ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleDeleteCard(c.id)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-black touch-manipulation"
                          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Delete</button>
                        <button onClick={() => setConfirmCard(null)} aria-label="Cancel delete"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-content-muted"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center flex-shrink-0">
                        <button onClick={() => setEditor({ card: c })} aria-label="Edit card"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted touch-manipulation"><Pencil size={14} /></button>
                        <button onClick={() => setConfirmCard(c.id)} aria-label="Delete card"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted touch-manipulation"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {deckCards.length === 0 ? null : confirmDeck ? (
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleDeleteDeck} className="px-4 py-2.5 rounded-xl text-xs font-black touch-manipulation"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Delete deck and {deckCards.length} cards</button>
                <button onClick={() => setConfirmDeck(false)} className="text-xs font-bold text-content-secondary">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeck(true)} className="block mx-auto text-xs font-bold text-content-muted touch-manipulation">
                Delete this deck
              </button>
            )}
          </>
        ) : cards.length === 0 ? (
          /* ── Empty state ── */
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-strong)' }}>
            <p className="text-4xl mb-3" aria-hidden="true">🧠</p>
            <p className="text-base font-black text-content-primary" style={{ fontFamily: 'Georgia, serif' }}>Turn your notes into flashcards</p>
            <p className="text-xs text-content-secondary mt-1 mb-5">
              Paste your notes and let AI write the cards. Then review a few minutes a day — the app schedules each card for you.
            </p>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => setShowGenerate(true)}
                className="py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 touch-manipulation"
                style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
                <Sparkles size={16} /> Generate from notes
              </button>
              <button onClick={() => setEditor({})} className="py-3 rounded-2xl text-sm font-bold text-content-secondary touch-manipulation" style={surface}>
                Add a card manually
              </button>
            </div>
          </div>
        ) : (
          /* ── Hub ── */
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Layers, label: 'Due today', value: dueTotal, color: '#60a5fa' },
                { icon: Flame,  label: 'Day streak', value: streak,  color: '#fb923c' },
                { icon: Trophy, label: 'Mastered',  value: masteredTotal, color: '#22c55e' },
              ].map(t => (
                <div key={t.label} className="rounded-2xl p-3.5" style={surface}>
                  <t.icon size={16} style={{ color: t.color }} />
                  <p className="text-2xl font-black text-content-primary tabular-nums mt-2" style={{ fontFamily: 'Georgia, serif' }}>{t.value}</p>
                  <p className="text-[11px] font-semibold text-content-secondary">{t.label}</p>
                </div>
              ))}
            </div>

            <motion.button onClick={() => startSession()} disabled={dueTotal === 0}
              className="w-full rounded-2xl p-5 text-left touch-manipulation disabled:opacity-100"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(5,150,105,0.08))',
                border: '1px solid rgba(34,197,94,0.25)', boxShadow: 'var(--shadow-card)',
              }}
              whileTap={dueTotal > 0 ? { scale: 0.98 } : undefined}>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Daily revision</p>
              <p className="text-lg font-black text-content-primary" style={{ fontFamily: 'Georgia, serif' }}>
                {dueTotal > 0 ? `Review ${dueTotal} ${dueTotal === 1 ? 'card' : 'cards'} now` : "You're all caught up 🎉"}
              </p>
              <p className="text-xs text-content-secondary mt-0.5">
                {dueTotal > 0 ? 'A few minutes keeps your streak alive.' : 'Come back tomorrow — your next cards will be waiting.'}
              </p>
            </motion.button>

            <div className="flex gap-3">
              <button onClick={() => setShowGenerate(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-content-primary flex items-center justify-center gap-2 touch-manipulation" style={surface}>
                <Sparkles size={15} className="text-green-500" /> Generate
              </button>
              <button onClick={() => setEditor({})}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-content-primary flex items-center justify-center gap-2 touch-manipulation" style={surface}>
                <Plus size={16} /> New card
              </button>
            </div>

            <section aria-label="Decks">
              <h2 className="text-base font-black text-content-primary mb-3" style={{ fontFamily: 'Georgia, serif' }}>Your decks</h2>
              <div className="space-y-3">
                {decks.map(d => {
                  const pct = d.total ? Math.round((d.mastered / d.total) * 100) : 0;
                  return (
                    <button key={d.deck} onClick={() => { setActiveDeck(d.deck); setConfirmDeck(false); setConfirmCard(null); setView('deck'); }}
                      className="w-full rounded-2xl p-4 text-left touch-manipulation" style={surface}>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <p className="text-sm font-bold text-content-primary truncate">{d.deck}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {d.due > 0 && (
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.18)', color: '#3b82f6' }}>
                              {d.due} due
                            </span>
                          )}
                          <ChevronRight size={16} className="text-content-muted" />
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}
                        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${d.deck} mastery`}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#22c55e' }} />
                      </div>
                      <p className="text-[11px] text-content-secondary mt-2">
                        {d.total} cards · {d.mastered} mastered · {d.learning} learning · {d.fresh} new
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-content-muted text-center mt-4">
                A card counts as mastered once you remember it after a gap of 3 weeks or more.
              </p>
            </section>
          </>
        )}
      </div>

      <AnimatePresence>
        {showGenerate && (
          <GenerateSheet key="gen" decks={deckNames} defaultDeck={inDeck ? activeDeck : deckNames[0] ?? 'General'}
            notes={noteSources} existing={cards} onClose={() => setShowGenerate(false)} onSave={handleGenerated} />
        )}
        {editor && (
          <CardEditorSheet key="edit" initial={editor.card} decks={deckNames} defaultDeck={inDeck ? activeDeck : deckNames[0] ?? 'General'}
            onClose={() => setEditor(null)} onSave={handleEditorSave} />
        )}
      </AnimatePresence>
    </div>
  );
}
