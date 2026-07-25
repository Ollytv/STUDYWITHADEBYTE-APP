// src/pages/Squads.tsx

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Flame, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Squad } from '../types';
import { CreateSquadModal } from '../components/CreateSquadModal';
import { SquadLeaderboard } from '../components/SquadLeaderboard';

function inviteUrl(squadId: string): string {
  return `${window.location.origin}/app/squads/join/${squadId}`;
}

async function shareInvite(squad: Squad) {
  const url = inviteUrl(squad.id);
  if (navigator.share) {
    try {
      await navigator.share({ title: `Join "${squad.name}" on StudiByte`, url });
    } catch {
      // user cancelled share sheet — no-op
    }
  } else {
    await navigator.clipboard.writeText(url);
  }
}

export default function Squads() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'squads'), where('memberUids', 'array-contains', uid));
    const unsub = onSnapshot(q, (snap) => {
      setSquads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Squad)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return (
    <div className="min-h-screen bg-dark-950 pb-28">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} className="text-dark-300" />
          </button>
          <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Study Squads
          </h1>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
          aria-label="Create squad"
        >
          <Plus size={18} className="text-green-400" />
        </motion.button>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : squads.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-sm text-dark-400 mb-3">No squads yet — start one and invite classmates.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 border border-green-500/30 px-3 py-2 rounded-xl touch-manipulation"
            >
              <Plus size={12} /> Start a squad
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {squads.map((squad, i) => (
              <motion.div
                key={squad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300 }}
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.1), rgba(244,114,182,0.03))', border: '1px solid rgba(244,114,182,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{squad.name}</p>
                    <p className="text-xs text-dark-500">{squad.members.length} member{squad.members.length === 1 ? '' : 's'} · {squad.dailyGoalMinutes} min/day goal</p>
                  </div>
                  <div className="flex items-center gap-1 text-orange-400">
                    <Flame size={16} />
                    <span className="text-lg font-black" style={{ fontFamily: 'Georgia, serif' }}>{squad.streakCount}</span>
                  </div>
                </div>
                <button
                  onClick={() => shareInvite(squad)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-pink-300"
                >
                  <Share2 size={12} /> Invite classmates
                </button>

                <SquadLeaderboard squad={squad} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateSquadModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => setShowCreate(false)}
      />
    </div>
  );
}
