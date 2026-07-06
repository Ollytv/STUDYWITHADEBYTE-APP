import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Brain, BarChart2, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

type TimerMode = 'study' | 'break';

const PRESETS = [
  { label: '25 / 5',  study: 25, break: 5 },
  { label: '45 / 10', study: 45, break: 10 },
  { label: '60 / 15', study: 60, break: 15 },
];

export default function Timer() {
 const { studySessions, addStudySession } = useStore();
  const navigate = useNavigate();

  const [preset, setPreset]   = useState(0);
  const [mode, setMode]       = useState<TimerMode>('study');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState(0);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);

  const studyMins = PRESETS[preset].study;
  const breakMins = PRESETS[preset].break;
  const totalSecs = (mode === 'study' ? studyMins : breakMins) * 60;
  const remaining = totalSecs - elapsed;
  const percentage = Math.round((elapsed / totalSecs) * 100);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= totalSecs) {
            playBeep();
            if (mode === 'study') {
              addStudySession({ date: new Date().toISOString().split('T')[0], duration: studyMins, type: 'study' });
              setSessions(s => s + 1);
              setMode('break');
            } else {
              setMode('study');
            }
            setRunning(false);
            return 0;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, totalSecs, mode, studyMins, playBeep, addStudySession]);

  const reset  = () => { setRunning(false); setElapsed(0); setMode('study'); };
  const toggle = () => setRunning(r => !r);
  const fmt    = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const todayStudy = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return studySessions.filter(s => s.date === today && s.type === 'study').reduce((sum, s) => sum + s.duration, 0);
  }, [studySessions]);

  const weekStudy = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return studySessions.filter(s => s.type === 'study' && new Date(s.date) >= weekAgo).reduce((sum, s) => sum + s.duration, 0);
  }, [studySessions]);

  const ringColor = mode === 'study' ? '#22c55e' : '#3b82f6';

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="px-4 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(ROUTES.app.more)}
            className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Study Timer</h1>
            <p className="text-xs text-dark-400 font-body">Pomodoro technique for focused studying</p>
          </div>
        </div>
      </div>

      {/* Mode indicator */}
      <div className="flex items-center justify-center gap-3 mb-6 px-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${mode === 'study' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-dark-800 border-white/5 text-dark-500'}`}>
          <Brain size={14} /><span className="text-xs font-semibold font-body">Study</span>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${mode === 'break' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-dark-800 border-white/5 text-dark-500'}`}>
          <Coffee size={14} /><span className="text-xs font-semibold font-body">Break</span>
        </div>
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-8">
        <ProgressRing percentage={percentage} size={220} strokeWidth={10} color={ringColor}>
          <div className="text-center">
            <p className="text-5xl font-mono font-bold text-white tabular-nums">{fmt(remaining)}</p>
            <p className="text-sm font-body text-dark-400 mt-1">
              {mode === 'study' ? `${studyMins} min focus` : `${breakMins} min break`}
            </p>
            {sessions > 0 && (
              <p className="text-xs font-body text-dark-500 mt-1">{sessions} session{sessions !== 1 ? 's' : ''} done</p>
            )}
          </div>
        </ProgressRing>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8 px-4">
        <motion.button onClick={reset}
          className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white"
          whileTap={{ scale: 0.9 }}>
          <RotateCcw size={20} />
        </motion.button>
        <motion.button onClick={toggle}
          className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${mode === 'study' ? 'bg-green-500 shadow-green-glow' : 'bg-blue-500'}`}
          whileTap={{ scale: 0.93 }}>
          {running ? <Pause size={30} className="text-dark-950" /> : <Play size={30} className="text-dark-950 ml-1" />}
        </motion.button>
        <motion.button
          onClick={() => { setMode(m => m === 'study' ? 'break' : 'study'); setElapsed(0); setRunning(false); }}
          className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white"
          whileTap={{ scale: 0.9 }}>
          {mode === 'study' ? <Coffee size={20} /> : <Brain size={20} />}
        </motion.button>
      </div>

      {/* Presets */}
      <div className="px-4 mb-6">
        <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-3">Presets</p>
        <div className="flex gap-2">
          {PRESETS.map((p, i) => (
            <button key={p.label}
              onClick={() => { setPreset(i); setElapsed(0); setRunning(false); }}
              className={`flex-1 py-3 rounded-2xl text-xs font-body font-semibold border transition-all ${
                preset === i ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-dark-800 border-white/5 text-dark-500'
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4">
        <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-3">
          <BarChart2 size={12} className="inline mr-1.5" />Study Stats
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today',     value: `${todayStudy}m`,  sub: `${Math.floor(todayStudy / 60)}h ${todayStudy % 60}m` },
            { label: 'This Week', value: `${weekStudy}m`,   sub: `${Math.round(weekStudy / 60 * 10) / 10}h total` },
            { label: 'Sessions',  value: String(studySessions.filter(s => s.type === 'study').length), sub: 'all time' },
          ].map(stat => (
            <div key={stat.label} className="bg-dark-800 border border-white/5 rounded-2xl p-3 text-center">
              <p className="text-lg font-display font-bold text-white">{stat.value}</p>
              <p className="text-xs font-body text-dark-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}