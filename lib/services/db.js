"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFriendlyError = getFriendlyError;
exports.getAllClasses = getAllClasses;
exports.saveClass = saveClass;
exports.deleteClass = deleteClass;
exports.getAttendanceByClass = getAttendanceByClass;
exports.saveAttendance = saveAttendance;
exports.deleteAttendance = deleteAttendance;
exports.getProfile = getProfile;
exports.saveProfile = saveProfile;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.getAllGPACourses = getAllGPACourses;
exports.saveGPACourse = saveGPACourse;
exports.deleteGPACourse = deleteGPACourse;
exports.getAllAssignments = getAllAssignments;
exports.saveAssignment = saveAssignment;
exports.deleteAssignment = deleteAssignment;
exports.getAllStudySessions = getAllStudySessions;
exports.saveStudySession = saveStudySession;
exports.getAllMaterials = getAllMaterials;
exports.saveMaterial = saveMaterial;
exports.deleteMaterial = deleteMaterial;
exports.listenToClasses = listenToClasses;
exports.listenToAssignments = listenToAssignments;
exports.exportAllData = exportAllData;
exports.clearAllData = clearAllData;
// src/services/db.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const materialStorage_1 = require("./materialStorage");
const profilePictureStorage_1 = require("./profilePictureStorage");
// ── Environment-safe logger ───────────────────────────────────────────────────
// In development: logs full error details to the console.
// In production:  logs only a safe context label — no stack traces, no internal
//                 paths, no Firebase collection names visible to the user.
const isDev = import.meta.env.DEV;
function logError(context, error) {
    if (isDev) {
        console.error(`[DB:${context}]`, error);
    }
    else {
        // Production: emit only the context label so DevTools reveals nothing useful
        // to an attacker who opens the browser console on a production build.
        console.error(`[DB:${context}] An error occurred.`);
    }
}
// ── User-facing error messages ────────────────────────────────────────────────
// Converts internal Firebase/network errors into safe, human-readable strings.
// Never expose raw Firebase error codes or internal paths to the UI.
function getFriendlyError(error) {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('not authenticated'))
            return 'Please log in to continue.';
        if (msg.includes('storage'))
            return 'File upload failed. Please try again.';
        if (msg.includes('auth'))
            return 'Session expired. Please log in again.';
        if (msg.includes('network') || msg.includes('offline'))
            return 'Network error. Check your connection and try again.';
        if (msg.includes('timeout'))
            return 'Upload timed out. Check your connection and try again.';
        if (msg.includes('quota'))
            return 'Storage limit reached. Please contact support.';
    }
    return 'Something went wrong. Please try again.';
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
    const user = firebase_1.auth.currentUser;
    if (!user)
        throw new Error('Not authenticated');
    return user.uid;
}
function userCol(col) {
    return (0, firestore_1.collection)(firebase_1.db, 'users', uid(), col);
}
function userDoc(col, id) {
    return (0, firestore_1.doc)(firebase_1.db, 'users', uid(), col, id);
}
async function getAll(col) {
    const snap = await (0, firestore_1.getDocs)(userCol(col));
    return snap.docs.map(d => d.data());
}
// ── stripUndefined ────────────────────────────────────────────────────────────
// Recursively removes keys whose value is `undefined` from a plain object.
// Firestore's setDoc() throws a hard error if any field value is undefined.
// This guard ensures no optional field from anywhere in the app causes that crash.
function stripUndefined(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj))
        return obj;
    return Object.fromEntries(Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]));
}
// ── sanitiseString ────────────────────────────────────────────────────────────
// Trims and collapses internal whitespace. Applied to all string fields before
// they are written to Firestore to prevent leading/trailing whitespace and
// multi-space injection from being stored.
function sanitiseString(value) {
    if (typeof value === 'string') {
        return value.trim().replace(/\s+/g, ' ');
    }
    return value;
}
// ── deepSanitise ─────────────────────────────────────────────────────────────
// Recursively applies sanitiseString to all string values in an object.
// This is the single point where all data is cleaned before hitting Firestore.
function deepSanitise(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return sanitiseString(obj);
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepSanitise(v)]));
}
// ── save ──────────────────────────────────────────────────────────────────────
// Central write function for all Firestore documents.
// Applies: undefined stripping → string sanitisation → merge write.
async function save(col, data) {
    const id = data.id || data.dataVersion?.toString() || 'singleton';
    const safe = deepSanitise(stripUndefined(data));
    await (0, firestore_1.setDoc)(userDoc(col, id), { ...safe, updatedAt: (0, firestore_1.serverTimestamp)() }, { merge: true });
}
async function remove(col, id) {
    await (0, firestore_1.deleteDoc)(userDoc(col, id));
}
// ── Input length limits ───────────────────────────────────────────────────────
// Applied at the DB layer as a final safety net. The UI layer should also
// enforce these, but belt-and-suspenders is the correct approach.
const LIMITS = {
    courseName: 100,
    courseCode: 20,
    lecturer: 100,
    venue: 100,
    description: 1000,
    noteContent: 5000,
    linkUrl: 2000,
    materialName: 200,
    assignTitle: 200,
    fullName: 100,
    department: 100,
    matricNumber: 30,
};
function truncate(value, max) {
    if (!value)
        return '';
    return value.slice(0, max);
}
// ── URL validation ────────────────────────────────────────────────────────────
// Ensures link-type material content is a safe HTTP/HTTPS URL.
// Blocks javascript:, data:, vbscript:, and other dangerous protocols.
function validateAndSanitiseUrl(url) {
    const trimmed = url.trim().slice(0, LIMITS.linkUrl);
    try {
        const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid URL protocol.');
        }
        return parsed.href;
    }
    catch {
        throw new Error('Invalid URL. Only http:// and https:// links are allowed.');
    }
}
// ── Classes ───────────────────────────────────────────────────────────────────
async function getAllClasses() {
    return getAll('classes');
}
async function saveClass(c) {
    // Enforce field length limits before writing
    const safe = {
        ...c,
        courseName: truncate(c.courseName, LIMITS.courseName),
        courseCode: truncate(c.courseCode, LIMITS.courseCode),
        lecturer: truncate(c.lecturer, LIMITS.lecturer),
        venue: truncate(c.venue, LIMITS.venue),
    };
    await save('classes', safe);
}
async function deleteClass(id) {
    await remove('classes', id);
    const att = await getAttendanceByClass(id);
    if (att.length > 0) {
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        att.forEach(r => batch.delete(userDoc('attendance', r.id)));
        await batch.commit();
    }
}
// ── Attendance ────────────────────────────────────────────────────────────────
async function getAttendanceByClass(classId) {
    const q = (0, firestore_1.query)(userCol('attendance'), (0, firestore_1.where)('classId', '==', classId));
    const snap = await (0, firestore_1.getDocs)(q);
    return snap.docs.map(d => d.data());
}
async function saveAttendance(r) {
    await save('attendance', r);
}
async function deleteAttendance(id) {
    await remove('attendance', id);
}
// ── Profile ───────────────────────────────────────────────────────────────────
async function getProfile() {
    const snap = await (0, firestore_1.getDoc)(userDoc('meta', 'profile'));
    if (!snap.exists())
        return undefined;
    const profile = snap.data();
    // ── Reconstruct avatar blob: URL from IndexedDB ────────────────────────
    // blob: URLs are session-scoped — they cannot be stored in Firestore.
    // We store '' in Firestore and rebuild the URL here on every app load.
    // If no picture is stored, avatar stays as whatever Firestore has (could
    // be a legacy Firebase Storage URL from before this migration).
    const blobUrl = await (0, profilePictureStorage_1.loadProfilePicture)();
    if (blobUrl) {
        console.info('[db.getProfile] Avatar loaded from IndexedDB.');
        return { ...profile, avatar: blobUrl };
    }
    // No IndexedDB avatar — return profile as-is (may have legacy Storage URL
    // or empty string — both are handled correctly by the UI)
    return profile;
}
async function saveProfile(profile) {
    let avatarUrl = profile.avatar || '';
    if (avatarUrl.startsWith('data:')) {
        // ── Profile picture → IndexedDB (not Firebase Storage) ────────────────
        // saveProfilePicture() validates MIME type and size, stores the binary
        // in IndexedDB, and returns a blob: URL for immediate display.
        // Errors are thrown with clear messages and logged to the console.
        try {
            avatarUrl = await (0, profilePictureStorage_1.saveProfilePicture)(avatarUrl);
            console.info('[db.saveProfile] Avatar saved to IndexedDB successfully.');
        }
        catch (err) {
            // Log clearly so upload failures are visible in DevTools
            console.error('[db.saveProfile] Avatar save to IndexedDB failed:', err);
            throw err; // re-throw so Settings.tsx can show the user an error
        }
    }
    else if (!avatarUrl && profile.avatar === '') {
        // ── Avatar explicitly cleared — remove from IndexedDB ─────────────────
        const { deleteProfilePicture } = await Promise.resolve().then(() => __importStar(require('./profilePictureStorage')));
        await deleteProfilePicture();
    }
    // avatarUrl is now a blob: URL (new upload), existing blob: URL (no change),
    // or empty string (cleared). Do NOT persist blob: URLs to Firestore —
    // they are session-scoped and invalid after reload. Store empty string instead
    // so getProfile() + loadProfilePicture() reconstruct the URL on next load.
    const firestoreAvatarValue = avatarUrl.startsWith('blob:') ? '' : avatarUrl;
    // Enforce field length limits on profile data
    const profileToSave = {
        ...profile,
        avatar: firestoreAvatarValue,
        fullName: truncate(profile.fullName, LIMITS.fullName),
        department: truncate(profile.department, LIMITS.department),
        matricNumber: truncate(profile.matricNumber, LIMITS.matricNumber),
        ...(profile.cgpaScale !== undefined
            ? { cgpaScale: Number(profile.cgpaScale) }
            : {}),
    };
    await (0, firestore_1.setDoc)(userDoc('meta', 'profile'), stripUndefined(profileToSave), { merge: true });
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'users', uid()), {
        fullName: profileToSave.fullName,
        department: profileToSave.department,
        programLevel: profileToSave.programLevel,
        ...(profileToSave.cgpaScale !== undefined ? { cgpaScale: profileToSave.cgpaScale } : {}),
        updatedAt: (0, firestore_1.serverTimestamp)(),
    }, { merge: true });
}
// ── Settings ──────────────────────────────────────────────────────────────────
async function getSettings() {
    const snap = await (0, firestore_1.getDoc)(userDoc('meta', 'settings'));
    return snap.exists() ? snap.data() : undefined;
}
async function saveSettings(settings) {
    await (0, firestore_1.setDoc)(userDoc('meta', 'settings'), stripUndefined(settings), { merge: true });
}
// ── GPA Courses ───────────────────────────────────────────────────────────────
async function getAllGPACourses() {
    return getAll('gpaCourses');
}
async function saveGPACourse(c) {
    const safe = {
        ...c,
        courseName: truncate(c.courseName, LIMITS.courseName),
        courseCode: truncate(c.courseCode, LIMITS.courseCode),
        // Clamp credit units to a realistic range (1–10)
        creditUnits: Math.max(1, Math.min(10, Math.floor(Number(c.creditUnits) || 3))),
    };
    await save('gpaCourses', safe);
}
async function deleteGPACourse(id) {
    await remove('gpaCourses', id);
}
// ── Assignments ───────────────────────────────────────────────────────────────
async function getAllAssignments() {
    return getAll('assignments');
}
async function saveAssignment(a) {
    const safe = {
        ...a,
        title: truncate(a.title, LIMITS.assignTitle),
        courseCode: truncate(a.courseCode, LIMITS.courseCode),
        courseName: truncate(a.courseName, LIMITS.courseName),
        description: truncate(a.description, LIMITS.description),
    };
    await save('assignments', safe);
}
async function deleteAssignment(id) {
    await remove('assignments', id);
}
// ── Study Sessions ────────────────────────────────────────────────────────────
async function getAllStudySessions() {
    return getAll('studySessions');
}
async function saveStudySession(s) {
    await save('studySessions', s);
}
// ── Materials ─────────────────────────────────────────────────────────────────
//
// All material storage now goes through IndexedDB via materialStorage.ts.
// The Firebase Storage upload path has been removed. When you are ready to
// migrate to Firebase Storage, implement the same interface in a new file
// and swap the imports in materialStorage.ts — no changes needed here or
// in the UI layer.
async function getAllMaterials() {
    return (0, materialStorage_1.getMaterialsFromIDB)();
}
async function saveMaterial(m) {
    await (0, materialStorage_1.saveMaterialToIDB)(m);
}
async function deleteMaterial(id) {
    await (0, materialStorage_1.deleteMaterialFromIDB)(id);
}
// ── Real-time listeners ───────────────────────────────────────────────────────
function listenToClasses(callback) {
    return (0, firestore_1.onSnapshot)(userCol('classes'), snap => {
        callback(snap.docs.map(d => d.data()));
    });
}
function listenToAssignments(callback) {
    return (0, firestore_1.onSnapshot)(userCol('assignments'), snap => {
        callback(snap.docs.map(d => d.data()));
    });
}
// ── Export / Clear ────────────────────────────────────────────────────────────
async function exportAllData() {
    const [classes, attendance, gpaCourses, assignments, studySessions, materials, profile] = await Promise.all([
        getAllClasses(),
        getAll('attendance'),
        getAllGPACourses(),
        getAllAssignments(),
        getAllStudySessions(),
        getAllMaterials(),
        getProfile(),
    ]);
    return JSON.stringify({
        exportDate: new Date().toISOString(),
        version: 3,
        classes, attendance, gpaCourses, assignments,
        studySessions, materials, profile,
    }, null, 2);
}
async function clearAllData() {
    const cols = ['classes', 'attendance', 'gpaCourses', 'assignments', 'studySessions', 'materials'];
    await Promise.all(cols.map(async (col) => {
        const snap = await (0, firestore_1.getDocs)(userCol(col));
        if (snap.docs.length === 0)
            return;
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }));
}
//# sourceMappingURL=db.js.map