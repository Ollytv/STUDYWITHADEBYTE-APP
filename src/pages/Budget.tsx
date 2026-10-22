import { useMemo, useState, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet as Sheet } from '../components/ui/BottomSheet';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, X, Wallet, Settings2, AlertTriangle,
} from 'lucide-react';
import { ROUTES } from '../routes';
import { useBudget } from '../hooks/useBudget';
import { getFriendlyError } from '../services/db';
import { generateId } from '../utils/id';
import {
  Expense, ExpenseCategory, BudgetSettings,
  EXPENSE_CATEGORY_META, getExpenseCategoryMeta,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_AMOUNT = 1_000_000_000;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthKey = (d: Date) => toISODate(d).slice(0, 7);

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function dayLabel(iso: string, today: string, yesterday: string): string {
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** Green under 80 %, amber 80–99 %, red at/over the limit. */
const statusColor = (pct: number) => (pct >= 100 ? '#f87171' : pct >= 80 ? '#fbbf24' : '#22c55e');

/** Keeps only digits and a single decimal point. */
const cleanNumberInput = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

const inputStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-primary)',
} as const;

const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">{children}</p>
);

const PrimaryButton = ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
  <button type="submit" disabled={disabled}
    className="w-full py-3.5 rounded-2xl text-sm font-black touch-manipulation disabled:opacity-40"
    style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
    {children}
  </button>
);

// ── Add expense ───────────────────────────────────────────────────────────────

function AddExpenseSheet({ today, onClose, onSave }: {
  today: string; onClose: () => void; onSave: (e: Expense) => void;
}) {
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [date, setDate]         = useState(today);
  const [note, setNote]         = useState('');
  const [error, setError]       = useState('');

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError('Enter an amount greater than zero.');
    if (n > MAX_AMOUNT) return setError('That amount is too large.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Pick a valid date.');
    onSave({
      id: generateId(),
      amount: Math.round(n * 100) / 100,
      category,
      date,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <Sheet title="Add expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <Label>Amount (₦)</Label>
          <input autoFocus inputMode="decimal" placeholder="0.00" value={amount}
            onChange={e => { setAmount(cleanNumberInput(e.target.value)); setError(''); }}
            className="w-full px-4 py-3.5 rounded-2xl text-2xl font-black focus:outline-none tabular-nums"
            style={inputStyle} aria-label="Amount in naira" />
        </div>

        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORY_META.map(c => {
              const active = c.value === category;
              return (
                <button key={c.value} type="button" aria-pressed={active}
                  onClick={() => setCategory(c.value)}
                  className="rounded-2xl py-3 px-1 flex flex-col items-center gap-1 touch-manipulation"
                  style={{
                    background: active ? `${c.color}22` : 'var(--bg-surface)',
                    border: `1px solid ${active ? c.color : 'var(--border-color)'}`,
                  }}>
                  <span className="text-xl" aria-hidden="true">{c.emoji}</span>
                  <span className="text-[10px] font-bold text-content-secondary leading-tight text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl text-sm focus:outline-none" style={inputStyle} aria-label="Date" />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <input value={note} maxLength={200} placeholder="e.g. Keke to campus"
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl text-sm focus:outline-none" style={inputStyle} aria-label="Note" />
          </div>
        </div>

        {error && <p role="alert" className="text-xs font-semibold" style={{ color: '#f87171' }}>{error}</p>}
        <PrimaryButton>Save expense</PrimaryButton>
      </form>
    </Sheet>
  );
}

// ── Set budget ────────────────────────────────────────────────────────────────

function BudgetSheet({ budget, onClose, onSave }: {
  budget: BudgetSettings; onClose: () => void; onSave: (b: BudgetSettings) => void;
}) {
  const [total, setTotal] = useState(budget.monthlyTotal > 0 ? String(budget.monthlyTotal) : '');
  const [limits, setLimits] = useState<Partial<Record<ExpenseCategory, string>>>(
    () => Object.fromEntries(
      EXPENSE_CATEGORY_META.map(c => [c.value, budget.categoryLimits[c.value] ? String(budget.categoryLimits[c.value]) : ''])
    )
  );
  const [error, setError] = useState('');

  const num = (v?: string) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
  const limitsSum = EXPENSE_CATEGORY_META.reduce((s, c) => s + num(limits[c.value]), 0);
  const overTotal = num(total) > 0 && limitsSum > num(total);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (num(total) > MAX_AMOUNT || limitsSum > MAX_AMOUNT) return setError('One of those amounts is too large.');
    const categoryLimits: BudgetSettings['categoryLimits'] = {};
    EXPENSE_CATEGORY_META.forEach(c => { const v = num(limits[c.value]); if (v > 0) categoryLimits[c.value] = v; });
    onSave({ monthlyTotal: num(total), categoryLimits });
  };

  return (
    <Sheet title="Monthly budget" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <Label>Total for the month (₦)</Label>
          <input autoFocus inputMode="decimal" placeholder="e.g. 40000" value={total}
            onChange={e => { setTotal(cleanNumberInput(e.target.value)); setError(''); }}
            className="w-full px-4 py-3.5 rounded-2xl text-2xl font-black focus:outline-none tabular-nums"
            style={inputStyle} aria-label="Total monthly budget in naira" />
        </div>

        <div>
          <Label>Category limits (optional)</Label>
          <div className="space-y-2">
            {EXPENSE_CATEGORY_META.map(c => (
              <div key={c.value} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center" aria-hidden="true">{c.emoji}</span>
                <span className="text-sm font-semibold text-content-primary flex-1 min-w-0 truncate">{c.label}</span>
                <input inputMode="decimal" placeholder="No limit" value={limits[c.value] ?? ''}
                  onChange={e => { setLimits(l => ({ ...l, [c.value]: cleanNumberInput(e.target.value) })); setError(''); }}
                  className="w-32 px-3 py-2.5 rounded-xl text-sm text-right focus:outline-none tabular-nums"
                  style={inputStyle} aria-label={`${c.label} limit in naira`} />
              </div>
            ))}
          </div>
          {overTotal && (
            <p className="text-xs font-semibold mt-3" style={{ color: '#fbbf24' }}>
              Your category limits add up to {fmt(limitsSum)}, which is more than your total budget.
            </p>
          )}
        </div>

        {error && <p role="alert" className="text-xs font-semibold" style={{ color: '#f87171' }}>{error}</p>}
        <PrimaryButton>Save budget</PrimaryButton>
        <p className="text-[11px] text-content-muted text-center -mt-2">Applies to every month. Leave a field empty for no limit.</p>
      </form>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Budget() {
  const navigate = useNavigate();
  const { expenses, budget, loading, error, retry, addExpense, removeExpense, updateBudget } = useBudget();

  const now          = new Date();
  const todayISO     = toISODate(now);
  const yesterdayISO = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const currentMonth = monthKey(now);

  const [month, setMonth]           = useState(currentMonth);
  const [showAdd, setShowAdd]       = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const monthExpenses = useMemo(
    () => expenses
      .filter(e => e.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [expenses, month]
  );

  const total = useMemo(
    () => Math.round(monthExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100,
    [monthExpenses]
  );

  const byCategory = useMemo(() => {
    const totals = Object.fromEntries(EXPENSE_CATEGORY_META.map(c => [c.value, 0])) as Record<ExpenseCategory, number>;
    monthExpenses.forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + e.amount; });
    return totals;
  }, [monthExpenses]);

  const categoryRows = useMemo(
    () => EXPENSE_CATEGORY_META
      .map(meta => ({ meta, spent: Math.round(byCategory[meta.value] * 100) / 100, limit: budget.categoryLimits[meta.value] ?? 0 }))
      .filter(r => r.spent > 0 || r.limit > 0)
      .sort((a, b) => b.spent - a.spent),
    [byCategory, budget.categoryLimits]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    monthExpenses.forEach(e => { const arr = map.get(e.date) ?? []; arr.push(e); map.set(e.date, arr); });
    return Array.from(map.entries());
  }, [monthExpenses]);

  const hasBudget   = budget.monthlyTotal > 0;
  const pct         = hasBudget ? (total / budget.monthlyTotal) * 100 : 0;
  const remaining   = budget.monthlyTotal - total;
  const isCurrent   = month === currentMonth;
  const daysLeft    = isCurrent ? daysInMonth(month) - now.getDate() + 1 : 0;
  const barColor    = statusColor(pct);

  const handleAdd = (e: Expense) => {
    setShowAdd(false);
    setActionError('');
    // If the entry is in another month, jump there so the user sees it appear.
    setMonth(e.date.slice(0, 7));
    addExpense(e).catch(err => setActionError(getFriendlyError(err)));
  };

  const handleBudget = (b: BudgetSettings) => {
    setShowBudget(false);
    setActionError('');
    updateBudget(b).catch(err => setActionError(getFriendlyError(err)));
  };

  const handleDelete = (id: string) => {
    setConfirmId(null);
    setActionError('');
    removeExpense(id).catch(err => setActionError(getFriendlyError(err)));
  };

  return (
    <div className="min-h-screen bg-surface-base pb-32">

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'var(--nav-bg)' }}>
        <div className="px-5 pt-14 pb-4 flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.app.more)} aria-label="Back"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-content-secondary flex-shrink-0 touch-manipulation"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-content-primary" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
              Budget Planner
            </h1>
            <p className="text-xs text-content-secondary">Track spending, stay in control</p>
          </div>
          <button onClick={() => setShowBudget(true)} aria-label="Set monthly budget"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-content-secondary flex-shrink-0 touch-manipulation"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Month switcher */}
      <div className="flex items-center justify-between px-5 pt-3 pb-4">
        <button onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Previous month"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-content-secondary touch-manipulation"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold text-content-primary" aria-live="polite">{monthLabel(month)}</p>
        <button onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={month >= currentMonth} aria-label="Next month"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-content-secondary touch-manipulation disabled:opacity-30"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-5 space-y-5">

        {actionError && (
          <div role="alert" className="rounded-2xl p-3.5 flex items-start gap-2.5"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs text-content-primary flex-1">{actionError} Your last change may not have been saved.</p>
            <button onClick={() => setActionError('')} aria-label="Dismiss" className="text-content-muted"><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading budget">
            {[140, 120, 80].map((h, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ height: h, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-sm font-bold text-content-primary mb-1">Couldn't load your budget</p>
            <p className="text-xs text-content-secondary mb-4">{error}</p>
            <button onClick={retry} className="px-5 py-2.5 rounded-xl text-sm font-black touch-manipulation"
              style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <motion.div className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(5,150,105,0.08))',
                border: '1px solid rgba(34,197,94,0.2)', boxShadow: 'var(--shadow-card)',
              }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet size={12} className="text-green-500" />
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Spent this month</span>
              </div>
              <p className="text-4xl font-black text-content-primary tabular-nums"
                style={{ fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>
                {fmt(total)}
              </p>

              {hasBudget ? (
                <>
                  <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}
                    role="progressbar" aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={Math.min(Math.round(pct), 100)} aria-label="Share of monthly budget spent">
                    <motion.div className="h-full rounded-full" style={{ background: barColor }}
                      initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-content-secondary tabular-nums">{Math.round(pct)}% of {fmt(budget.monthlyTotal)}</span>
                    <span className="font-bold tabular-nums" style={{ color: remaining < 0 ? '#f87171' : 'var(--text-primary)' }}>
                      {remaining < 0 ? `${fmt(Math.abs(remaining))} over` : `${fmt(remaining)} left`}
                    </span>
                  </div>
                  {isCurrent && remaining > 0 && daysLeft > 0 && (
                    <p className="text-xs text-content-secondary mt-3">
                      About <span className="font-bold text-content-primary tabular-nums">{fmt(Math.floor(remaining / daysLeft))}</span> a day
                      for the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
                    </p>
                  )}
                </>
              ) : (
                <button onClick={() => setShowBudget(true)}
                  className="mt-4 text-xs font-black text-green-500 touch-manipulation">
                  Set a monthly budget to track your progress →
                </button>
              )}
            </motion.div>

            {/* Categories */}
            {categoryRows.length > 0 && (
              <section aria-label="Spending by category">
                <h2 className="text-base font-black text-content-primary mb-3" style={{ fontFamily: 'Georgia, serif' }}>By category</h2>
                <div className="rounded-2xl p-4 space-y-4"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                  {categoryRows.map(({ meta, spent, limit }) => {
                    const catPct = limit > 0 ? (spent / limit) * 100 : total > 0 ? (spent / total) * 100 : 0;
                    const color  = limit > 0 ? statusColor(catPct) : meta.color;
                    return (
                      <div key={meta.value}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-content-primary">
                            <span aria-hidden="true">{meta.emoji}</span> {meta.label}
                          </span>
                          <span className="text-xs text-content-secondary tabular-nums">
                            {fmt(spent)}{limit > 0 && ` / ${fmt(limit)}`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}
                          role="progressbar" aria-valuemin={0} aria-valuemax={100}
                          aria-valuenow={Math.min(Math.round(catPct), 100)} aria-label={`${meta.label} spending`}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(catPct, 100)}%`, background: color }} />
                        </div>
                        {limit > 0 && catPct >= 80 && (
                          <p className="text-[11px] font-semibold mt-1" style={{ color }}>
                            {catPct >= 100 ? `${fmt(spent - limit)} over your limit` : 'Close to your limit'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Expenses */}
            <section aria-label="Expenses">
              <h2 className="text-base font-black text-content-primary mb-3" style={{ fontFamily: 'Georgia, serif' }}>Expenses</h2>

              {groups.length === 0 ? (
                <div className="rounded-2xl p-8 text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-strong)' }}>
                  <p className="text-3xl mb-2" aria-hidden="true">💸</p>
                  <p className="text-sm font-bold text-content-primary">No expenses in {monthLabel(month)}</p>
                  <p className="text-xs text-content-secondary mt-1 mb-4">Log what you spend to see where your money goes.</p>
                  <button onClick={() => setShowAdd(true)}
                    className="px-5 py-2.5 rounded-xl text-sm font-black touch-manipulation"
                    style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
                    Add expense
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map(([date, items]) => (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-xs font-bold text-content-muted uppercase tracking-wider">{dayLabel(date, todayISO, yesterdayISO)}</p>
                        <p className="text-xs font-bold text-content-muted tabular-nums">
                          {fmt(Math.round(items.reduce((s, e) => s + e.amount, 0) * 100) / 100)}
                        </p>
                      </div>
                      <div className="rounded-2xl overflow-hidden"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                        {items.map((e, i) => {
                          const meta = getExpenseCategoryMeta(e.category);
                          const confirming = confirmId === e.id;
                          return (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-3"
                              style={i > 0 ? { borderTop: '1px solid var(--border-color)' } : undefined}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                                style={{ background: `${meta.color}20` }} aria-hidden="true">{meta.emoji}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-content-primary truncate">{e.note || meta.label}</p>
                                {e.note && <p className="text-xs text-content-muted">{meta.label}</p>}
                              </div>
                              <p className="text-sm font-black text-content-primary tabular-nums flex-shrink-0">{fmt(e.amount)}</p>
                              {confirming ? (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button onClick={() => handleDelete(e.id)}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-black touch-manipulation"
                                    style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Delete</button>
                                  <button onClick={() => setConfirmId(null)} aria-label="Cancel delete"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-content-muted touch-manipulation">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setConfirmId(e.id)} aria-label={`Delete ${e.note || meta.label} expense`}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted flex-shrink-0 touch-manipulation">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Add button */}
      {!loading && !error && (
        <motion.button onClick={() => setShowAdd(true)} aria-label="Add expense"
          className="fixed right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center touch-manipulation"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000',
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
          }}
          whileTap={{ scale: 0.9 }} initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          <Plus size={26} strokeWidth={2.6} />
        </motion.button>
      )}

      <AnimatePresence>
        {showAdd && <AddExpenseSheet key="add" today={todayISO} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
        {showBudget && <BudgetSheet key="budget" budget={budget} onClose={() => setShowBudget(false)} onSave={handleBudget} />}
      </AnimatePresence>
    </div>
  );
}
