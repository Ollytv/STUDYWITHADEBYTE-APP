// src/hooks/useAdminAuth.ts
//
// Reuses the existing signIn/signOut/onAuthChange from src/services/auth.ts
// (the same functions the student AuthScreen uses) — this is the same
// Firebase Auth project, just with an added allowlist check on top.
// Persists across refreshes automatically via onAuthStateChanged.

import { useCallback, useEffect, useState } from 'react';
import {
  signIn as fbSignIn,
  signOut as fbSignOut,
  onAuthChange,
  AuthUser,
} from '../services/auth';
import { checkIsAdmin } from '../services/adminAuth';

interface AdminAuthState {
  user:    AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      const isAdmin = await checkIsAdmin(user.uid);
      setState({ user, isAdmin, loading: false });
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const user = await fbSignIn(email, password);
    const isAdmin = await checkIsAdmin(user.uid);
    if (!isAdmin) {
      await fbSignOut();
      throw new Error('This account is not authorized for admin access.');
    }
    setState({ user, isAdmin: true, loading: false });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await fbSignOut();
    setState({ user: null, isAdmin: false, loading: false });
  }, []);

  return { ...state, login, logout };
}
