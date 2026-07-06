// src/pages/Import.tsx
//
// ⚠️ RECONSTRUCTED FILE — read before assuming this matches your original design.
//
// The original Import.tsx was accidentally overwritten with Landing.tsx content
// and was never seen by Claude in this conversation, so its original UI/styling
// could not be restored byte-for-byte. This is a fresh implementation built to
// satisfy the exact contract still defined elsewhere in the project:
//   - useStore.ts  → importClasses(classes: Partial<CourseClass>[]): Promise<void>
//   - index.ts     → ImportResult { classes, rawText, confidence }
//   - package.json → pdfjs-dist, mammoth, tesseract.js installed for parsing
// If you have a backup of the real Import.tsx (git history, another branch,
// a previous Netlify deploy), restore from that instead — it will be more
// accurate than this reconstruction. This file is a functional placeholder
// using the same UI primitives (Button, EmptyState) as the rest of the app.

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { ChevronLeft, Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { CourseClass } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

type ParseStatus = 'idle' | 'parsing' | 'success' | 'error';

export default function Import() {
  const { importClasses } = useStore();
  const navigate = useNavigate();

  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<ParseStatus>('idle');
  const [error, setError]     = useState('');
  const [preview, setPreview] = useState<Partial<CourseClass>[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [saving, setSaving]   = useState(false);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError('');
    setPreview([]);
    setConfidence(0);
  };

  const handleFile = useCallback(async (selected: File) => {
    setFile(selected);
    setStatus('parsing');
    setError('');

    try {
      // NOTE: actual parsing (pdfjs-dist for PDFs, mammoth for .docx,
      // tesseract.js OCR for images) is not reconstructed here — wire your
      // original parsing service back in at this point. This reconstruction
      // only restores the page shell and the save flow into importClasses.
      const result = await parseTimetableFile(selected);
      setPreview(result.classes);
      setConfidence(result.confidence);
      setStatus('success');
    } catch (err) {
      console.error('[Import] Parse error:', err);
      setError('Could not read this file. Try a clearer PDF, image, or Word document.');
      setStatus('error');
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
  };

  const handleSave = async () => {
    if (preview.length === 0) return;
    setSaving(true);
    try {
      // handleSave success path
      await importClasses(preview);
      navigate(ROUTES.app.timetable);
    } catch (err) {
      console.error('[Import] Save error:', err);
      setError('Could not save the imported classes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
           // header back button
            onClick={() => navigate(ROUTES.app.timetable)}
            className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Import Timetable</h1>
            <p className="text-xs text-dark-400 font-body">Upload a PDF, image, or Word document</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        {status === 'idle' && (
          <motion.label
            htmlFor="import-file-input"
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-dark-800/50 py-14 px-6 text-center cursor-pointer touch-manipulation"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
              <Upload size={20} className="text-green-400" />
            </div>
            <p className="text-sm font-display font-semibold text-white">Drop a file here, or tap to browse</p>
            <p className="text-xs text-dark-400 font-body">Supports PDF, JPG, PNG, and DOCX timetables</p>
            <input
              id="import-file-input"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={onPick}
            />
          </motion.label>
        )}

        {status === 'parsing' && (
          <motion.div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-dark-800/50 border border-white/8 py-14 px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <Loader2 size={22} className="text-green-400 animate-spin" />
            <p className="text-sm font-display font-semibold text-white">Reading {file?.name}…</p>
            <p className="text-xs text-dark-400 font-body">This can take a moment for scanned images.</p>
          </motion.div>
        )}

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
            <Button variant="secondary" onClick={reset}>Try another file</Button>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-green-400" />
              <p className="text-sm font-display font-semibold text-white">
                Found {preview.length} class{preview.length === 1 ? '' : 'es'}
              </p>
              {confidence > 0 && (
                <span className="text-[10px] text-dark-500 font-body ml-auto">
                  {Math.round(confidence * 100)}% confidence
                </span>
              )}
            </div>

            {preview.length === 0 ? (
              <EmptyState
                icon={<FileText size={28} />}
                title="Nothing detected"
                description="We couldn't find any class entries in this file. Try a clearer scan or a different format."
                action={{ label: 'Try another file', onClick: reset }}
              />
            ) : (
              <div className="space-y-2.5 mb-6">
                {preview.map((c, i) => (
                  <div key={i} className="bg-dark-800 border border-white/5 rounded-2xl p-4">
                    <p className="text-sm font-display font-semibold text-white">{c.courseName || 'Untitled course'}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-dark-400 font-body">
                      <span>{c.courseCode || 'N/A'}</span>
                      <span>•</span>
                      <span>{c.day || 'Day TBD'}</span>
                      <span>•</span>
                      <span>{c.startTime || '--:--'}–{c.endTime || '--:--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {preview.length > 0 && (
              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={reset}>Cancel</Button>
                <Button fullWidth onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : `Add ${preview.length} class${preview.length === 1 ? '' : 'es'}`}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Placeholder parser ──────────────────────────────────────────────────────
// Reconstructed stub only — replace with your original pdfjs-dist / mammoth /
// tesseract.js parsing logic (confirmed present in package.json) plus
// whatever AI-assisted extraction your original Import page used.
async function parseTimetableFile(_file: File): Promise<{ classes: Partial<CourseClass>[]; rawText: string; confidence: number }> {
  throw new Error(
    'Timetable parsing logic was not recoverable and needs to be re-implemented here (pdfjs-dist / mammoth / tesseract.js are already installed in package.json).'
  );
}
