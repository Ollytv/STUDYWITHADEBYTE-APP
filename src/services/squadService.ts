// src/services/squadService.ts

import {
  collection, doc, getDoc, setDoc, updateDoc, arrayRemove,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from './firebase';
import { Squad, SquadMember } from '../types';

const functions = getFunctions();
const joinSquadCallable = httpsCallable<{ squadId: string }, { success: boolean }>(functions, 'joinSquad');
const getSquadPreviewCallable = httpsCallable<
  { squadId: string },
  { name: string; memberCount: number; dailyGoalMinutes: number; isFull: boolean }
>(functions, 'getSquadPreview');

/** Preview a squad from an invite link before joining — a non-member has no
 * direct Firestore read path (see firestore.rules), so this always goes
 * through the Cloud Function. */
export async function previewSquad(squadId: string) {
  const result = await getSquadPreviewCallable({ squadId });
  return result.data;
}

export async function createSquad(name: string, dailyGoalMinutes: number): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to create a squad.');

  const squadRef = doc(collection(db, 'squads'));
  const member: SquadMember = {
    uid: user.uid,
    displayName: user.displayName ?? 'Student',
    joinedAt: new Date().toISOString(),
    ...(user.photoURL ? { avatar: user.photoURL } : {}),
  };

  const squad: Omit<Squad, 'id'> = {
    name,
    createdBy: user.uid,
    members: [member],
    memberUids: [user.uid],
    streakCount: 0,
    dailyGoalMinutes,
    createdAt: new Date().toISOString(),
  };

  await setDoc(squadRef, squad);
  return squadRef.id;
}

/** Joining requires the Cloud Function — a prospective member has no
 * client-side write path onto a squad they don't yet belong to. */
export async function joinSquad(squadId: string): Promise<void> {
  const result = await joinSquadCallable({ squadId });
  if (!result.data.success) {
    throw new Error('Failed to join squad.');
  }
}

/** Leaving is allowed client-side — an existing member removing themselves
 * satisfies the firestore.rules update-diff-size check. arrayRemove needs an
 * exact object match, so the current member entry is read first. */
export async function leaveSquad(squadId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in.');

  const squadRef = doc(db, 'squads', squadId);
  const snap = await getDoc(squadRef);
  if (!snap.exists()) return;

  const squad = snap.data() as Squad;
  const memberEntry = squad.members.find((m) => m.uid === user.uid);
  if (!memberEntry) return; // already not a member

  await updateDoc(squadRef, {
    memberUids: arrayRemove(user.uid),
    members: arrayRemove(memberEntry),
  });
}

export function subscribeToSquad(squadId: string, onChange: (squad: Squad | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'squads', squadId), (snap) => {
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Squad) : null);
  });
}