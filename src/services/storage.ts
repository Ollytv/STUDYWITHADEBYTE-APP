// src/services/storage.ts
//
// Firebase Storage uploads for profile pictures and course materials.
// Reuses the existing `storage` instance from ./firebase — no separate init.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';

// ── Limits ─────────────────────────────────────────────────────────────────
const MAX_PROFILE_PICTURE_MB = 5;
const MAX_COURSE_MATERIAL_MB = 25;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_MATERIAL_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export class StorageUploadError extends Error {
  code: 'file-too-large' | 'invalid-type' | 'network-error' | 'unknown';
  constructor(message: string, code: StorageUploadError['code']) {
    super(message);
    this.name = 'StorageUploadError';
    this.code = code;
  }
}

function validateFile(file: File, maxMB: number, allowedTypes: string[]): void {
  if (file.size > maxMB * 1024 * 1024) {
    throw new StorageUploadError(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed is ${maxMB} MB.`,
      'file-too-large'
    );
  }
  if (!allowedTypes.includes(file.type)) {
    throw new StorageUploadError(
      `File type "${file.type || 'unknown'}" is not allowed.`,
      'invalid-type'
    );
  }
}

/** Maps a Firebase Storage error code to a user-facing message. */
function mapStorageError(err: unknown): StorageUploadError {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'storage/unauthorized') {
    return new StorageUploadError('You do not have permission to upload this file.', 'unknown');
  }
  if (code === 'storage/canceled') {
    return new StorageUploadError('Upload was canceled.', 'unknown');
  }
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/unknown') {
    return new StorageUploadError('Network error — please check your connection and try again.', 'network-error');
  }
  return new StorageUploadError((err as Error)?.message ?? 'Upload failed. Please try again.', 'unknown');
}

// ── Profile picture ───────────────────────────────────────────────────────

/**
 * Uploads a user's profile picture to `users/{userId}/profile.jpg`
 * (fixed filename — a re-upload overwrites the previous picture, so old
 * pictures never orphan in Storage). Returns the public download URL to
 * store on the user's profile document.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  validateFile(file, MAX_PROFILE_PICTURE_MB, ALLOWED_IMAGE_TYPES);

  const storageRef = ref(storage, `users/${userId}/profile.jpg`);

  try {
    await uploadBytesResumable(storageRef, file, { contentType: file.type });
    return await getDownloadURL(storageRef);
  } catch (err) {
    throw mapStorageError(err);
  }
}

/** Deletes a user's profile picture, if one exists. Safe to call speculatively. */
export async function deleteProfilePicture(userId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, `users/${userId}/profile.jpg`));
  } catch (err) {
    // Not found is fine — nothing to delete
    if ((err as { code?: string })?.code !== 'storage/object-not-found') {
      console.warn('[storage] Failed to delete profile picture:', err);
    }
  }
}

// ── Course materials ──────────────────────────────────────────────────────
//
// NOTE: materials in this app are private to each student (filtered by
// semester/academicYear on their own profile), not shared across users by
// courseId — so this uses users/{userId}/materials/{fileName}, matching the
// owner-only pattern the rest of the app's Firestore data already uses,
// rather than a shared courses/{courseId}/{fileName} path that would let
// any authenticated user read or overwrite another student's uploads.

/**
 * Uploads a course material (PDF/image) to
 * `users/{userId}/materials/{materialId}_{fileName}`, reporting progress via
 * onProgress (0–100). fileName is sanitized; materialId (pass your generated
 * material id) keeps re-uploads of same-named files from colliding.
 *
 * Returns the download URL and the storage path (store the path too if you
 * ever need to delete the file later — deleteObject needs the exact path).
 */
export async function uploadCourseMaterial(
  userId: string,
  materialId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; path: string }> {
  validateFile(file, MAX_COURSE_MATERIAL_MB, ALLOWED_MATERIAL_TYPES);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `users/${userId}/materials/${materialId}_${safeName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    task.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(percent);
      },
      (err) => {
        reject(mapStorageError(err));
      },
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          resolve({ url, path });
        } catch (err) {
          reject(mapStorageError(err));
        }
      }
    );
  });
}

/** Deletes a course material by its exact storage path (the `path` returned above). */
export async function deleteCourseMaterial(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if ((err as { code?: string })?.code !== 'storage/object-not-found') {
      console.warn('[storage] Failed to delete course material:', err);
    }
  }
}
