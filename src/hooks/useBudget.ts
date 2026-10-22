import { useCallback, useEffect, useState } from 'react';
import { Expense, BudgetSettings, DEFAULT_BUDGET } from '../types';
import * as db from '../services/db';

/**
 * Budget Planner data hook.
 *
 * Deliberately separate from useStore: it subscribes on mount and unsubscribes
 * on unmount, so it adds no listeners or state to the rest of the app and never
 * touches the auth/bootstrap flow.
 *
 * Writes are not awaited for server acknowledgement by callers — Firestore's
 * local cache updates the listeners immediately, so the UI stays instant on
 * flaky connections. The returned promises still reject on real failures
 * (e.g. permission-denied) so the page can surface them.
 */
export function useBudget() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget]     = useState<BudgetSettings>(DEFAULT_BUDGET);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [attempt, setAttempt]   = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');

    let expensesReady = false;
    let budgetReady   = false;
    const markReady = () => { if (expensesReady && budgetReady) setLoading(false); };
    const fail = (e: unknown) => { setError(db.getFriendlyError(e)); setLoading(false); };

    const unsubs: Array<() => void> = [];
    try {
      unsubs.push(db.listenToExpenses(list => {
        setExpenses(list);
        expensesReady = true;
        markReady();
      }, fail));
      unsubs.push(db.listenToBudget(b => {
        setBudget(b);
        budgetReady = true;
        markReady();
      }, fail));
    } catch (e) {
      fail(e);
    }

    return () => unsubs.forEach(u => u());
  }, [attempt]);

  const retry         = useCallback(() => setAttempt(a => a + 1), []);
  const addExpense    = useCallback((e: Expense) => db.saveExpense(e), []);
  const removeExpense = useCallback((id: string) => db.deleteExpense(id), []);
  const updateBudget  = useCallback((b: BudgetSettings) => db.saveBudget(b), []);

  return { expenses, budget, loading, error, retry, addExpense, removeExpense, updateBudget };
}
