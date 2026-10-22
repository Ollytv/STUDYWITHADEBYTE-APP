// src/pages/Import.tsx
//
// Upload a timetable (JPG / PNG / WEBP / PDF) → AI extracts the classes →
// student reviews / edits them → saved through the store's importClasses().

import { motion } from 'framer-motion';
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft, Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Trash2, Pencil, AlertTriangle, Copy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { CourseClass, DayOfWeek } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ROUTES } from '../routes';
import { formatTimeRange, getDayOrder } from '../utils/time';
import {
  ExtractedClass, assignColors, findConflicts, validateRow,
} from '../utils/timetableParse';
import { extractTimetable } from '../services/timetableExtract';

type Status = 'idle' | 'parsing' | 'review' | 'error';
type Row = ExtractedClass & { include: boolean };

const DAYS = getDayOrder();
const LOW_CONFIDENCE = 0.6;

const fieldCls =
  'w-full px-3 py-2.5 rounded-xl text-xs font-body text-white placeholder-dark-600 focus:outline-none bg-dark-900 border border-white/10 focus:border-green-500/50';
const labelCls = 'block text-[10px] font-body font-semibold text-dark-400 uppercase tracking-wider mb-1';

export default function Import() {
  const { importClasses, classes, activeSemester, activeAcademicYear } = useStore();
  const navigate = useNavigate();

  const [file, setFile]         = useState<File | null>(null);
  const [status, setStatus]     = useState<Status>('idle');
  const [error, setError]       = useState('');
  const [rows, setRows]         = useState<Row[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving]     = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const existing = useMemo(
    () => classes.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear),
    [classes, activeSemester, activeAcademicYear],
  );

  const conflicts = useMemo(() => findConflicts(rows, existing), [rows, existing]);

  const reset = () => {
    abortRef.current?.abort();
    setFile(null); setStatus('idle'); setError('');
    setRows([]); setConfidence(0); setExpanded(new Set());
  };

  const handleFile = useCallback(async (selected: File) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setFile(selected);
    setStatus('parsing');
    setError('');

    try {
      const result = await extractTimetable(selected, ctrl.signal);
      if (ctrl.signal.aborted) return;

      // Pre-untick classes that are already in this semester's timetable.
      const initialConflicts = findConflicts(result.classes, existing);
      setRows(result.classes.map(c => ({ ...c, include: !initialConflicts[c.key]?.duplicateOfExisting })));
      setConfidence(result.confidence);
      setExpanded(new Set());
      setStatus('review');
    } catch (err: any) {
      if (ctrl.signal.aborted) return;
      console.error('[Import] Extract error:', err);
      setError(err?.message || 'Could not read this file. Try a clearer photo or a different PDF.');
      setStatus('error');
    }
  }, [existing]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failure
    if (picked) handleFile(picked);
  };

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) => setRows(rs => rs.filter(r => r.key !== key));

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const included = rows.filter(r => r.include);
  const blocking = included.filter(r => validateRow(r).length > 0);
  const needsReview = rows.filter(
    r => validateRow(r).length > 0 || r.confidence < LOW_CONFIDENCE || (conflicts[r.key]?.overlaps.length ?? 0) > 0,
  ).length;

  const handleSave = async () => {
    if (included.length === 0 || blocking.length > 0) return;
    setSaving(true);
    try {
      const colors = assignColors(included);
      const payload: Partial<CourseClass>[] = included.map((r, i) => ({
        courseCode: r.courseCode.trim().toUpperCase(),
        courseName: r.courseName.trim() || r.courseCode.trim(),
        lecturer: r.lecturer.trim(),
        day: r.day as DayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        venue: r.venue.trim(),
        colorLabel: colors[i],
      }));
      await importClasses(payload);
      navigate(ROUTES.app.timetable);
    } catch (err) {
      console.error('[Import] Save error:', err);
      setError('Could not save the imported classes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-28">
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.app.timetable)}
            className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Import Timetable</h1>
            <p className="text-xs text-dark-400 font-body">Upload a photo, screenshot or PDF of your timetable</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* ── IDLE ── */}
        {status === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <label
              htmlFor="import-file-input"
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-dark-800/50 py-14 px-6 text-center cursor-pointer touch-manipulation"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                <Upload size={20} className="text-green-400" />
              </div>
              <p className="text-sm font-display font-semibold text-white">Drop a file here, or tap to browse</p>
              <p className="text-xs text-dark-400 font-body">JPG, PNG, WEBP or PDF · up to the app's attachment size limit</p>
              <input
                id="import-file-input"
                type="file"
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPick}
              />
            </label>
            <p className="text-[11px] text-dark-500 font-body text-center mt-4 px-4">
              Works best with a straight-on, well-lit photo or the original PDF. You'll review everything before it's added.
            </p>
          </motion.div>
        )}

        {/* ── PARSING ── */}
        {status === 'parsing' && (
          <motion.div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-dark-800/50 border border-white/8 py-14 px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <Loader2 size={22} className="text-green-400 animate-spin" />
            <p className="text-sm font-display font-semibold text-white break-all">Reading {file?.name}…</p>
            <p className="text-xs text-dark-400 font-body">Finding your classes. This can take up to 30 seconds.</p>
            <button onClick={reset} className="text-xs text-dark-400 underline mt-2">Cancel</button>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <motion.div
            className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-400" />
              <p className="text-sm font-display font-semibold text-red-400">Couldn't read that file</p>
            </div>
            <p className="text-xs text-dark-300 font-body mb-4">{error}</p>
            <div className="flex gap-3">
              {file && <Button variant="secondary" onClick={() => handleFile(file)}>Retry</Button>}
              <Button variant="secondary" onClick={reset}>Try another file</Button>
            </div>
          </motion.div>
        )}

        {/* ── REVIEW ── */}
        {status === 'review' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-green-400" />
              <p className="text-sm font-display font-semibold text-white">
                Found {rows.length} class{rows.length === 1 ? '' : 'es'}
              </p>
              {confidence > 0 && (
                <span className="text-[10px] text-dark-500 font-body ml-auto">
                  {Math.round(confidence * 100)}% avg. confidence
                </span>
              )}
            </div>
            {rows.length > 0 && (
              <p className="text-xs text-dark-400 font-body mb-4">
                {needsReview > 0
                  ? `${needsReview} need${needsReview === 1 ? 's' : ''} a quick check — tap the pencil to edit.`
                  : 'Everything looks good. Tap the pencil on any class to edit it.'}
              </p>
            )}

            {rows.length === 0 ? (
              <EmptyState
                icon={<FileText size={28} />}
                title="Nothing detected"
                description="We couldn't find any class entries in this file. Try a clearer photo or the original PDF."
                action={{ label: 'Try another file', onClick: reset }}
              />
            ) : (
              <div className="space-y-2.5 mb-6">
                {rows.map(r => {
                  const errs = validateRow(r);
                  const info = conflicts[r.key];
                  const open = expanded.has(r.key) || errs.length > 0;
                  const lowConf = r.confidence < LOW_CONFIDENCE;
                  return (
                    <div
                      key={r.key}
                      className={`rounded-2xl border p-4 transition-opacity ${
                        errs.length ? 'border-red-500/30 bg-red-500/5'
                        : r.include ? 'border-white/5 bg-dark-800'
                        : 'border-white/5 bg-dark-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={e => updateRow(r.key, { include: e.target.checked })}
                          className="mt-1 w-4 h-4 accent-green-500 shrink-0"
                          aria-label={`Include ${r.courseCode || r.courseName}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-white truncate">
                            {r.courseName || r.courseCode || 'Untitled course'}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-dark-400 font-body">
                            {r.courseCode && <span className="font-mono">{r.courseCode}</span>}
                            <span>{r.day || 'Day?'}</span>
                            <span>
                              {r.startTime && r.endTime ? formatTimeRange(r.startTime, r.endTime) : 'Time?'}
                            </span>
                            {r.venue && <span>{r.venue}</span>}
                          </div>

                          {/* Flags */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {errs.map(e => (
                              <span key={e} className="inline-flex items-center gap-1 text-[10px] font-body px-2 py-0.5 rounded-lg bg-red-500/15 text-red-300">
                                <AlertCircle size={10} /> {e}
                              </span>
                            ))}
                            {lowConf && errs.length === 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-body px-2 py-0.5 rounded-lg bg-yellow-500/15 text-yellow-300">
                                <AlertTriangle size={10} /> Please double-check
                              </span>
                            )}
                            {info && info.overlaps.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-body px-2 py-0.5 rounded-lg bg-yellow-500/15 text-yellow-300">
                                <AlertTriangle size={10} /> Overlaps {info.overlaps.slice(0, 3).join(', ')}
                              </span>
                            )}
                            {info?.duplicateOfExisting && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-body px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-300">
                                <Copy size={10} /> Already in your timetable
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleExpanded(r.key)}
                            className="p-2 rounded-xl text-dark-400 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Edit class"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeRow(r.key)}
                            className="p-2 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Remove class"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Inline editor */}
                      {open && (
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Course code</label>
                            <input className={fieldCls} value={r.courseCode}
                              onChange={e => updateRow(r.key, { courseCode: e.target.value.toUpperCase() })} placeholder="CSC101" />
                          </div>
                          <div>
                            <label className={labelCls}>Day</label>
                            <select className={fieldCls} value={r.day}
                              onChange={e => updateRow(r.key, { day: e.target.value as DayOfWeek })}>
                              <option value="">Select day…</option>
                              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Course name</label>
                            <input className={fieldCls} value={r.courseName}
                              onChange={e => updateRow(r.key, { courseName: e.target.value })} placeholder="Introduction to Programming" />
                          </div>
                          <div>
                            <label className={labelCls}>Start</label>
                            <input type="time" className={fieldCls} value={r.startTime}
                              onChange={e => updateRow(r.key, { startTime: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>End</label>
                            <input type="time" className={fieldCls} value={r.endTime}
                              onChange={e => updateRow(r.key, { endTime: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Venue</label>
                            <input className={fieldCls} value={r.venue}
                              onChange={e => updateRow(r.key, { venue: e.target.value })} placeholder="Hall 3" />
                          </div>
                          <div>
                            <label className={labelCls}>Lecturer</label>
                            <input className={fieldCls} value={r.lecturer}
                              onChange={e => updateRow(r.key, { lecturer: e.target.value })} placeholder="Dr. Adebayo" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {error && <p className="text-xs text-red-400 font-body mb-3">{error}</p>}

            {rows.length > 0 && (
              <>
                {blocking.length > 0 && (
                  <p className="text-xs text-red-300 font-body mb-3">
                    Fix or untick {blocking.length} class{blocking.length === 1 ? '' : 'es'} marked in red to continue.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={reset}>Cancel</Button>
                  <Button fullWidth onClick={handleSave} disabled={saving || included.length === 0 || blocking.length > 0}>
                    {saving ? 'Saving…' : `Add ${included.length} class${included.length === 1 ? '' : 'es'}`}
                  </Button>
                </div>
                <p className="text-[11px] text-dark-500 font-body text-center mt-3">
                  Added to {activeSemester} semester, {activeAcademicYear}.
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
