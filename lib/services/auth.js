"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUp = signUp;
exports.signIn = signIn;
exports.signOut = signOut;
exports.resetPassword = resetPassword;
exports.resendVerificationEmail = resendVerificationEmail;
exports.onAuthChange = onAuthChange;
exports.getCurrentUser = getCurrentUser;
// src/services/auth.ts
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
// ── Input validation constants ────────────────────────────────────────────────
// Applied here (service layer) as a second line of defence after UI validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LEN = 254; // RFC 5321
const MIN_PASSWORD_LEN = 8; // OWASP recommendation
const MAX_PASSWORD_LEN = 128; // prevent DoS via bcrypt long-password attack
const MAX_NAME_LEN = 100;
function validateEmail(email) {
    const trimmed = email.trim();
    if (!trimmed)
        throw new Error('Email is required.');
    if (trimmed.length > MAX_EMAIL_LEN)
        throw new Error('Email address is too long.');
    if (!EMAIL_REGEX.test(trimmed))
        throw new Error('Please enter a valid email address.');
}
function validatePassword(password) {
    if (password.length < MIN_PASSWORD_LEN)
        throw new Error(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
    if (password.length > MAX_PASSWORD_LEN)
        throw new Error('Password is too long.');
}
function validateFullName(name) {
    const trimmed = name.trim();
    if (!trimmed)
        throw new Error('Full name is required.');
    if (trimmed.length > MAX_NAME_LEN)
        throw new Error('Name must be under 100 characters.');
    // Reject names that look like script injections (angle brackets, script tags)
    if (/<[^>]*>/.test(trimmed))
        throw new Error('Name contains invalid characters.');
}
// ── Sanitise a string for safe storage ───────────────────────────────────────
// Strips leading/trailing whitespace and collapses internal runs of whitespace.
function sanitise(value) {
    return value.trim().replace(/\s+/g, ' ');
}
// ── Sign Up ───────────────────────────────────────────────────────────────────
async function signUp(email, password, fullName) {
    // Validate all inputs before any Firebase call
    validateEmail(email);
    validatePassword(password);
    validateFullName(fullName);
    const safeEmail = email.trim().toLowerCase();
    const safeName = sanitise(fullName);
    const cred = await (0, auth_1.createUserWithEmailAndPassword)(firebase_1.auth, safeEmail, password);
    // Set display name on Firebase Auth profile
    await (0, auth_1.updateProfile)(cred.user, { displayName: safeName });
    // Send email verification so only real email addresses can use the app
    await (0, auth_1.sendEmailVerification)(cred.user).catch(() => {
        // Non-fatal — user can request a new verification email later
        console.warn('[Auth] Could not send verification email.');
    });
    // Create the user's root document in Firestore.
    // Only store the minimum required fields — no password, no session data.
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: safeEmail,
        fullName: safeName,
        createdAt: (0, firestore_1.serverTimestamp)(),
        institution: 'POLYIBADAN',
    });
    return cred.user;
}
// ── Sign In ───────────────────────────────────────────────────────────────────
async function signIn(email, password) {
    // Validate inputs before calling Firebase (avoids an unnecessary network round-trip)
    validateEmail(email);
    if (!password)
        throw new Error('Password is required.');
    const cred = await (0, auth_1.signInWithEmailAndPassword)(firebase_1.auth, email.trim().toLowerCase(), password);
    return cred.user;
}
// ── Sign Out ──────────────────────────────────────────────────────────────────
async function signOut() {
    await (0, auth_1.signOut)(firebase_1.auth);
}
// ── Password Reset ────────────────────────────────────────────────────────────
// Intentionally returns void whether the email exists or not — prevents
// user enumeration (an attacker cannot tell if an email is registered).
async function resetPassword(email) {
    validateEmail(email);
    // Firebase already handles the "email not found" case gracefully (no error thrown),
    // which naturally prevents user enumeration.
    await (0, auth_1.sendPasswordResetEmail)(firebase_1.auth, email.trim().toLowerCase());
}
// ── Resend email verification ─────────────────────────────────────────────────
async function resendVerificationEmail() {
    const user = firebase_1.auth.currentUser;
    if (!user)
        throw new Error('No signed-in user.');
    if (user.emailVerified)
        return; // already verified, nothing to do
    await (0, auth_1.sendEmailVerification)(user);
}
// ── Auth State Listener ───────────────────────────────────────────────────────
function onAuthChange(callback) {
    return (0, auth_1.onAuthStateChanged)(firebase_1.auth, callback);
}
// ── Get current user ──────────────────────────────────────────────────────────
function getCurrentUser() {
    return firebase_1.auth.currentUser;
}
//# sourceMappingURL=auth.js.map