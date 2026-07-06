"use strict";
// src/services/materialStorage.ts
//
// ── Storage abstraction for course materials ──────────────────────────────────
//
// All file blobs and metadata are stored in IndexedDB.
// The UI and store never touch IndexedDB directly — they call this module only.
//
// MIGRATION PATH:
// When you are ready to move to Firebase Storage, implement the same interface
// in a new file (e.g. firebaseMaterialStorage.ts) and swap the import in db.ts.
// Zero UI changes required.
//
// DATABASE LAYOUT:
//   DB name : 'studibyte-materials'
//   Version : 1
//   Stores  :
//     'materials' — metadata records (CourseMaterialMeta)
//     'blobs'     — raw file ArrayBuffers, keyed by material id
//
// STORAGE LIMITS:
//   Soft warning : 50 MB total across all blobs
//   Hard block   : 100 MB total (rejects save above this)
//   Per-file     : 20 MB (matches the existing Firebase Storage rule)
//   IndexedDB quota is ultimately enforced by the browser (typically 10–80%
//   of available disk), so we add our own guards on top.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HARD_LIMIT_BYTES = exports.SOFT_LIMIT_BYTES = exports.MAX_FILE_BYTES = void 0;
exports.getStorageUsage = getStorageUsage;
exports.saveMaterialToIDB = saveMaterialToIDB;
exports.getMaterialsFromIDB = getMaterialsFromIDB;
exports.deleteMaterialFromIDB = deleteMaterialFromIDB;
exports.getStorageWarning = getStorageWarning;
// ── Constants ─────────────────────────────────────────────────────────────────
const DB_NAME = 'studibyte-materials';
const DB_VERSION = 1;
const STORE_META = 'materials';
const STORE_BLOB = 'blobs';
exports.MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
exports.SOFT_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB — warn
exports.HARD_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB — reject
// ── DB open ───────────────────────────────────────────────────────────────────
let _db = null;
function openDB() {
    if (_db)
        return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            // Metadata store — keyed by material id
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'id' });
            }
            // Blob store — keyed by material id (same key as metadata)
            if (!db.objectStoreNames.contains(STORE_BLOB)) {
                db.createObjectStore(STORE_BLOB, { keyPath: 'id' });
            }
        };
        req.onsuccess = e => {
            _db = e.target.result;
            // Re-open if the database is externally closed (e.g. storage pressure)
            _db.onclose = () => { _db = null; };
            resolve(_db);
        };
        req.onerror = () => reject(new Error(`Failed to open IndexedDB: ${req.error?.message}`));
        req.onblocked = () => reject(new Error('IndexedDB blocked — please close other tabs and try again.'));
    });
}
// ── Low-level IDB helpers ─────────────────────────────────────────────────────
function idbGet(db, store, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error(`IDB get failed: ${req.error?.message}`));
    });
}
function idbGetAll(db, store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error(`IDB getAll failed: ${req.error?.message}`));
    });
}
function idbPut(db, store, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(`IDB put failed: ${req.error?.message}`));
    });
}
function idbDelete(db, store, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(`IDB delete failed: ${req.error?.message}`));
    });
}
// Atomic: write metadata + blob in a single multi-store transaction
function idbPutBoth(db, meta, blobRecord) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_META, STORE_BLOB], 'readwrite');
        tx.objectStore(STORE_META).put(meta);
        tx.objectStore(STORE_BLOB).put(blobRecord);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(`IDB transaction failed: ${tx.error?.message}`));
    });
}
// Atomic: delete metadata + blob in a single transaction
function idbDeleteBoth(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_META, STORE_BLOB], 'readwrite');
        tx.objectStore(STORE_META).delete(id);
        tx.objectStore(STORE_BLOB).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(`IDB transaction failed: ${tx.error?.message}`));
    });
}
async function getStorageUsage() {
    const db = await openDB();
    const records = await idbGetAll(db, STORE_BLOB);
    const total = records.reduce((s, r) => s + (r.data?.byteLength ?? 0), 0);
    return {
        totalBytes: total,
        fileCount: records.length,
        nearLimit: total > exports.SOFT_LIMIT_BYTES,
        overLimit: total > exports.HARD_LIMIT_BYTES,
    };
}
// ── Data URL → ArrayBuffer ────────────────────────────────────────────────────
// Materials.tsx reads files as data URLs (base64). We convert to binary here
// so we store compact ArrayBuffers in IndexedDB, not bloated base64 strings.
function dataUrlToArrayBuffer(dataUrl) {
    const [header, b64] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
    const binary = atob(b64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++)
        view[i] = binary.charCodeAt(i);
    return { buffer, mimeType };
}
// ── ArrayBuffer → blob: URL ───────────────────────────────────────────────────
// Reconstructs a usable URL from stored bytes. The blob: URL is valid for the
// current browser session only — it is created fresh on every getMaterials() call.
function arrayBufferToBlobUrl(buffer, mimeType) {
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Save a material to IndexedDB.
 *
 * @param material  Full CourseMaterial object. For file types (pdf/image),
 *                  `content` must be a base64 data URL — it is converted to
 *                  an ArrayBuffer before storage. For note/link, `content`
 *                  is stored directly in metadata (no blob entry created).
 *
 * @throws If the file exceeds MAX_FILE_BYTES.
 * @throws If total storage would exceed HARD_LIMIT_BYTES.
 */
async function saveMaterialToIDB(material) {
    const db = await openDB();
    const isFile = material.type === 'pdf' || material.type === 'image';
    if (isFile) {
        // ── Validate and convert file content ──────────────────────────────────
        if (!material.content.startsWith('data:')) {
            throw new Error('File content must be a base64 data URL.');
        }
        const { buffer, mimeType } = dataUrlToArrayBuffer(material.content);
        // Per-file size check
        if (buffer.byteLength > exports.MAX_FILE_BYTES) {
            throw new Error(`File is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). ` +
                `Maximum allowed size is ${exports.MAX_FILE_BYTES / 1024 / 1024} MB.`);
        }
        // Total storage check
        const usage = await getStorageUsage();
        if (usage.totalBytes + buffer.byteLength > exports.HARD_LIMIT_BYTES) {
            throw new Error(`Storage limit reached (${(exports.HARD_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB). ` +
                'Please delete some materials before adding more.');
        }
        const meta = {
            id: material.id,
            name: material.name,
            courseCode: material.courseCode,
            courseName: material.courseName,
            type: material.type,
            size: buffer.byteLength,
            mimeType,
            semester: material.semester,
            academicYear: material.academicYear,
            createdAt: material.createdAt,
            storageBackend: 'indexeddb',
        };
        await idbPutBoth(db, meta, { id: material.id, data: buffer });
        return meta;
    }
    else {
        // ── Note or link — no blob, store content inline in metadata ──────────
        const meta = {
            id: material.id,
            name: material.name,
            courseCode: material.courseCode,
            courseName: material.courseName,
            type: material.type,
            size: undefined,
            mimeType: undefined,
            semester: material.semester,
            academicYear: material.academicYear,
            createdAt: material.createdAt,
            storageBackend: 'indexeddb',
            // For notes/links, store content directly in metadata
            firebaseUrl: material.content,
        };
        await idbPut(db, STORE_META, meta);
        return meta;
    }
}
/**
 * Load all materials from IndexedDB, reconstructing blob: URLs for files.
 *
 * Returns a fully hydrated `CourseMaterial[]` where `content` is either:
 *   - A fresh blob: URL (pdf/image) — valid for this session only
 *   - The original text content (note/link)
 *
 * Call this once on app startup (in loadData) and cache the result in Zustand.
 */
async function getMaterialsFromIDB() {
    const db = await openDB();
    const metas = await idbGetAll(db, STORE_META);
    const results = [];
    for (const meta of metas) {
        if (meta.storageBackend === 'indexeddb' && (meta.type === 'pdf' || meta.type === 'image')) {
            // Retrieve the stored ArrayBuffer and make a blob: URL
            const record = await idbGet(db, STORE_BLOB, meta.id);
            if (!record) {
                // Blob missing — skip (corrupted entry)
                console.warn(`[materialStorage] Blob missing for material ${meta.id} — skipping.`);
                continue;
            }
            results.push({
                id: meta.id,
                name: meta.name,
                courseCode: meta.courseCode,
                courseName: meta.courseName,
                type: meta.type,
                content: arrayBufferToBlobUrl(record.data, meta.mimeType ?? 'application/octet-stream'),
                size: meta.size,
                semester: meta.semester,
                academicYear: meta.academicYear,
                createdAt: meta.createdAt,
            });
        }
        else {
            // Note, link, or legacy Firebase material — content is in firebaseUrl
            results.push({
                id: meta.id,
                name: meta.name,
                courseCode: meta.courseCode,
                courseName: meta.courseName,
                type: meta.type,
                content: meta.firebaseUrl ?? '',
                size: meta.size,
                semester: meta.semester,
                academicYear: meta.academicYear,
                createdAt: meta.createdAt,
            });
        }
    }
    return results;
}
/**
 * Delete a material and its blob from IndexedDB.
 * Safe to call even if the material has no blob (note/link).
 */
async function deleteMaterialFromIDB(id) {
    const db = await openDB();
    const meta = await idbGet(db, STORE_META, id);
    if (!meta)
        return; // already gone — idempotent
    if (meta.storageBackend === 'indexeddb' && (meta.type === 'pdf' || meta.type === 'image')) {
        await idbDeleteBoth(db, id);
    }
    else {
        await idbDelete(db, STORE_META, id);
    }
}
/**
 * Check storage health. Returns a warning string if near limit, null if fine.
 * Call this before showing the add material button to surface limit warnings.
 */
async function getStorageWarning() {
    try {
        const usage = await getStorageUsage();
        if (usage.overLimit) {
            return `Storage full (${(usage.totalBytes / 1024 / 1024).toFixed(0)} MB used). Delete some materials to continue.`;
        }
        if (usage.nearLimit) {
            return `Storage nearly full (${(usage.totalBytes / 1024 / 1024).toFixed(0)} MB / ${exports.SOFT_LIMIT_BYTES / 1024 / 1024} MB). Consider deleting unused files.`;
        }
        return null;
    }
    catch {
        return null; // non-fatal
    }
}
//# sourceMappingURL=materialStorage.js.map