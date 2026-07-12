// src/services/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AuthUser = User;

// ── Input validation constants ────────────────────────────────────────────────
// Applied here (service layer) as a second line of defence after UI validation.
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LEN    = 254;  // RFC 5321
const MIN_PASSWORD_LEN = 8;    // OWASP recommendation
const MAX_PASSWORD_LEN = 128;  // prevent DoS via bcrypt long-password attack
const MAX_NAME_LEN     = 100;

function validateEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed)                         throw new Error('Email is required.');
  if (trimmed.length > MAX_EMAIL_LEN)   throw new Error('Email address is too long.');
  if (!EMAIL_REGEX.test(trimmed))       throw new Error('Please enter a valid email address.');
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LEN)
    throw new Error(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
  if (password.length > MAX_PASSWORD_LEN)
    throw new Error('Password is too long.');
}

function validateFullName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed)                       throw new Error('Full name is required.');
  if (trimmed.length > MAX_NAME_LEN)  throw new Error('Name must be under 100 characters.');
  // Reject names that look like script injections (angle brackets, script tags)
  if (/<[^>]*>/.test(trimmed))        throw new Error('Name contains invalid characters.');
}

// ── Sanitise a string for safe storage ───────────────────────────────────────
// Strips leading/trailing whitespace and collapses internal runs of whitespace.
function sanitise(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

// ── Sign Up ───────────────────────────────────────────────────────────────────
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthUser> {
  // Validate all inputs before any Firebase call
  validateEmail(email);
  validatePassword(password);
  validateFullName(fullName);

  const safeEmail    = email.trim().toLowerCase();
  const safeName     = sanitise(fullName);

  const cred = await createUserWithEmailAndPassword(auth, safeEmail, password);

  // Set display name on Firebase Auth profile
  await updateProfile(cred.user, { displayName: safeName });

  // Send email verification so only real email addresses can use the app
  await sendEmailVerification(cred.user).catch(() => {
    // Non-fatal — user can request a new verification email later
    console.warn('[Auth] Could not send verification email.');
  });

  // Create the user's root document in Firestore.
  // Only store the minimum required fields — no password, no session data.
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid:         cred.user.uid,
    email:       safeEmail,
    fullName:    safeName,
    createdAt:   serverTimestamp(),
    institution: 'POLYIBADAN',
  });

  return cred.user;
}

// ── Sign In ───────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string): Promise<AuthUser> {
  // Validate inputs before calling Firebase (avoids an unnecessary network round-trip)
  validateEmail(email);
  if (!password) throw new Error('Password is required.');

  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return cred.user;
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── Password Reset ────────────────────────────────────────────────────────────
// Intentionally returns void whether the email exists or not — prevents
// user enumeration (an attacker cannot tell if an email is registered).
export async function resetPassword(email: string): Promise<void> {
  validateEmail(email);
  // Firebase already handles the "email not found" case gracefully (no error thrown),
  // which naturally prevents user enumeration.
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

// ── Resend email verification ─────────────────────────────────────────────────
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user.');
  if (user.emailVerified) return; // already verified, nothing to do
  await sendEmailVerification(user);
}

// ── Auth State Listener ───────────────────────────────────────────────────────
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      // Forces Firebase to re-fetch the latest account state from the
      // server instead of trusting whatever was cached locally — required
      // for profile changes to propagate correctly across devices/tabs.
      await user.reload();
    } catch (e) {
      console.warn('[Auth] user.reload() failed, continuing with cached user:', e);
    }
    // Use auth.currentUser (not the stale `user` param) — reload() may
    // replace the underlying user object internally.
    callback(auth.currentUser);
  });
}

// ── Get current user ──────────────────────────────────────────────────────────
export function getCurrentUser(): AuthUser | null {
  return auth.currentUser;
}