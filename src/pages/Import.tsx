import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, FileType, CheckCircle, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { CourseClass } from '../types';
import { Button } from '../components/ui/Button';
import { getColorClasses } from '../utils/colors';

type Step = 'upload' | 'processing' | 'preview' | 'done' | 'error';

// Improved timetable parser
function parseText(text: string): Partial<CourseClass>[] {
  const classes: Partial<CourseClass>[] = [];
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const dayAliases: Record<string,string> = { mon:'Monday',tue:'Tuesday',tues:'Tuesday',wed:'Wednesday',thu:'Thursday',thur:'Thursday',thurs:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };
  const colors = ['green','blue','purple','orange','red','yellow','pink','cyan','teal','indigo'] as const;
  const id = () => `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  function detectDay(line: string): string | null {
    const lower = line.toLowerCase().trim();
    for (const d of days) if (lower.includes(d.toLowerCase())) return d;
    for (const [alias, day] of Object.entries(dayAliases)) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(line)) return day;
    }
    return null;
  }

  function parseTime(s: string): string | null {
    s = s.trim().toLowerCase().replace(/\s+/g, '');
    const m1 = s.match(/(\d{1,2}):(\d{2})(am|pm)?/i);
    if (m1) {
      let h = parseInt(m1[1]), min = m1[2], ap = (m1[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${min}`;
    }
    const m2 = s.match(/^(\d{3,4})(am|pm)?$/i);
    if (m2) {
      const t = m2[1].padStart(4,'0'), ap = (m2[2] || '').toLowerCase();
      let h = parseInt(t.slice(0,2));
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${t.slice(2)}`;
    }
    const m3 = s.match(/^(\d{1,2})(am|pm)$/i);
    if (m3) {
      let h = parseInt(m3[1]), ap = m3[2].toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:00`;
    }
    return null;
  }

  function extractTimeRange(line: string): { start: string; end: string } | null {
    const patterns = [
      /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      /(\d{1,2}\s*(?:am|pm))\s*[-–—to]+\s*(\d{1,2}\s*(?:am|pm))/i,
      /(\d{3,4})\s*[-–—to]+\s*(\d{3,4})/,
      /(\d{1,2}:\d{2}(?:am|pm)?)/gi,
    ];
    for (const pat of patterns.slice(0, 3)) {
      const m = line.match(pat);
      if (m) { const s = parseTime(m[1]), e = parseTime(m[2]); if (s && e) return { start: s, end: e }; }
    }
    // Single time with assumed duration
    const single = line.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (single) {
      const s = parseTime(single[1]);
      if (s) {
        const [h, m] = s.split(':').map(Number);
        const eh = h + 1, end = `${String(eh >= 24 ? 23 : eh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        return { start: s, end };
      }
    }
    return null;
  }

  function extractCode(line: string): string | null {
    const m = line.match(/\b([A-Z]{2,5}\s*\d{3,4}[A-Z]?)\b/);
    return m ? m[1].replace(/\s+/g,'') : null;
  }

  function extractVenue(line: string): string {
    const m = line.match(/\b(hall|lab|room|lec|lecture|theatre|class|building|block)\s*[\w\d]*/i);
    return m ? m[0].trim() : 'TBD';
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
  let currentDay = 'Monday';
  let colorIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const detectedDay = detectDay(line);
    if (detectedDay && line.length < 40) { currentDay = detectedDay; continue; }

    const timeRange = extractTimeRange(line);
    if (!timeRange) continue;

    const day = detectDay(line) || currentDay;
    const code = extractCode(line) || extractCode(lines[i+1] || '') || '';
    const venue = extractVenue(line);

    // Extract course name
    let name = line
      .replace(/\d{1,2}:\d{2}\s*(?:am|pm)?/gi, '')
      .replace(/[-–—]\s*\d{1,2}:\d{2}\s*(?:am|pm)?/gi, '')
      .replace(code, '').replace(venue, '')
      .replace(/[|\/\\]/g, ' ').replace(/\s+/g, ' ').trim();

    if (name.length < 3 && lines[i+1]) {
      name = lines[i+1].replace(extractCode(lines[i+1]) || '', '').trim().split(/[|,]/)[0].trim();
    }
    if (!name || name.length < 2) name = code ? `${code} Course` : 'Imported Course';

    classes.push({
      id: id(), courseName: name.slice(0,60), courseCode: code || 'N/A',
      day: day as any, startTime: timeRange.start, endTime: timeRange.end,
      venue: venue.slice(0,40), lecturer: 'TBD', department: '',
      colorLabel: colors[colorIdx++ % colors.length],
      totalClassesHeld: 0, totalClassesAttended: 0, attendancePercentage: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
  return classes;
}

async function importFile(file: File): Promise<{ classes: Partial<CourseClass>[]; text: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        // Preserve spatial layout by sorting items
        const items = (content.items as any[]).sort((a, b) => {
          const yDiff = Math.round(b.transform[5] / 10) - Math.round(a.transform[5] / 10);
          return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4];
        });
        text += items.map((i: any) => i.str).join(' ') + '\n';
      }
      return { classes: parseText(text), text };
    } catch (e) { throw new Error('PDF parsing failed. Try a text-based PDF.'); }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { classes: parseText(result.value), text: result.value };
    } catch (e) { throw new Error('Word document parsing failed.'); }
  }

  if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext || '')) {
    try {
      const Tesseract = await import('tesseract.js');
      const url = URL.createObjectURL(file);
      const result = await Tesseract.recognize(url, 'eng', { logger: () => {} });
      URL.revokeObjectURL(url);
      return { classes: parseText(result.data.text), text: result.data.text };
    } catch (e) { throw new Error('Image OCR failed. Try a clearer image.'); }
  }

  const text = await file.text();
  return { classes: parseText(text), text };
}

export default function Import() {
  const { importClasses } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [classes, setClasses] = useState<Partial<CourseClass>[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);

  const process = async (file: File) => {
    setStep('processing'); setProgress(10);
    const interval = setInterval(() => setProgress(p => Math.min(p + 6, 88)), 350);
    try {
      const { classes: found } = await importFile(file);
      clearInterval(interval); setProgress(100);
      if (found.length === 0) {
        setErrorMsg("No timetable data could be detected. Make sure the file contains course names and times, or try a different format.");
        setStep('error'); return;
      }
      setClasses(found);
      setSelected(new Set(found.map((_, i) => i)));
      setStep('preview');
    } catch (e: any) {
      clearInterval(interval);
      setErrorMsg(e.message || 'Failed to process file. Please try a different format.');
      setStep('error');
    }
  };

  const doImport = async () => {
    await importClasses(classes.filter((_, i) => selected.has(i)));
    setStep('done');
  };

  const reset = () => { setStep('upload'); setClasses([]); setSelected(new Set()); setProgress(0); setErrorMsg(''); };
  const toggle = (i: number) => setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="px-4 pt-14 pb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Import Timetable</h1>
        <p className="text-xs text-dark-400 font-body">PDF, Word, Image — we'll parse it automatically</p>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div
                className={`border-2 border-dashed rounded-3xl p-8 text-center mb-5 cursor-pointer transition-all duration-200 ${dragging ? 'border-green-500 bg-green-500/10' : 'border-white/12 bg-dark-800/50 hover:border-white/20 hover:bg-dark-800'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) process(f); }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-3xl bg-green-500/12 border border-green-500/25 flex items-center justify-center mx-auto mb-4">
                  <Upload size={28} className="text-green-400" />
                </div>
                <h3 className="text-base font-display font-semibold text-white mb-1">{dragging ? 'Drop it here!' : 'Upload your timetable'}</h3>
                <p className="text-sm font-body text-dark-400 mb-4">Drag & drop or tap to browse</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['PDF','DOC/DOCX','JPG/PNG','TXT'].map(f => (
                    <span key={f} className="text-xs font-mono px-2.5 py-1 bg-dark-700 border border-white/8 rounded-lg text-dark-300">{f}</span>
                  ))}
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) process(f); }} />

              {[
                { icon: FileType, label: 'PDF Timetable', desc: 'Official school timetable PDFs', ext: 'PDF' },
                { icon: FileText, label: 'Word Document', desc: 'DOC and DOCX files', ext: 'DOCX' },
                { icon: Image, label: 'Screenshot / Photo', desc: 'Photos of physical timetables', ext: 'IMG' },
              ].map(opt => (
                <div key={opt.ext} onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-dark-800 border border-white/5 cursor-pointer active:scale-[0.98] transition-transform mb-3 touch-manipulation">
                  <div className="w-10 h-10 rounded-2xl bg-dark-700 flex items-center justify-center">
                    <opt.icon size={18} className="text-green-400" />
                  </div>
                  <div className="flex-1"><p className="text-sm font-body font-medium text-white">{opt.label}</p><p className="text-xs font-body text-dark-500">{opt.desc}</p></div>
                  <span className="text-xs font-mono px-2 py-0.5 bg-dark-700 text-dark-400 rounded-lg">{opt.ext}</span>
                </div>
              ))}
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="proc" className="flex flex-col items-center py-24"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 size={48} className="text-green-400 animate-spin mb-6" />
              <h3 className="text-lg font-display font-semibold text-white mb-2">Analyzing timetable…</h3>
              <p className="text-sm font-body text-dark-400 mb-6">Detecting courses, times & venues</p>
              <div className="w-48 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <motion.div className="h-full bg-green-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-display font-semibold text-white">{classes.length} classes detected</h2>
                  <p className="text-xs text-dark-400 font-body">Select which ones to import</p>
                </div>
                <button onClick={reset}><X size={18} className="text-dark-400" /></button>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-dark-800 rounded-2xl border border-white/5 mb-4">
                <span className="text-sm font-body text-dark-200">{selected.size} of {classes.length} selected</span>
                <div className="flex gap-3">
                  <button onClick={() => setSelected(new Set(classes.map((_, i) => i)))} className="text-xs text-green-400 font-body">All</button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-dark-400 font-body">None</button>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {classes.map((cls, i) => {
                  const sel = selected.has(i);
                  const colors = getColorClasses(cls.colorLabel || 'green');
                  return (
                    <motion.div key={i} onClick={() => toggle(i)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all touch-manipulation ${sel ? 'bg-green-500/8 border-green-500/25' : 'bg-dark-800 border-white/5 opacity-50'}`}
                      whileTap={{ scale: 0.98 }}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${sel ? 'bg-green-500 border-green-500' : 'border-dark-500'}`}>
                          {sel && <CheckCircle size={12} className="text-dark-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-display font-semibold text-white truncate">{cls.courseName}</p>
                            <span className={`text-xs font-mono shrink-0 px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{cls.courseCode}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-body text-dark-400 flex-wrap">
                            <span>{cls.day}</span><span>•</span>
                            <span>{cls.startTime} – {cls.endTime}</span>
                            {cls.venue && cls.venue !== 'TBD' && <><span>•</span><span>{cls.venue}</span></>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex gap-3 pb-4">
                <Button variant="secondary" fullWidth onClick={reset} icon={<RefreshCw size={14} />}>Try Again</Button>
                <Button fullWidth onClick={doImport} disabled={selected.size === 0}>
                  Import {selected.size} class{selected.size !== 1 ? 'es' : ''}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" className="flex flex-col items-center py-20 text-center"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 rounded-3xl bg-green-500/12 border border-green-500/25 flex items-center justify-center mb-5">
                <CheckCircle size={36} className="text-green-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">Import Successful!</h3>
              <p className="text-sm font-body text-dark-400 mb-8 max-w-xs">Your classes have been added. View them in the Timetable tab.</p>
              <Button fullWidth onClick={reset}>Import Another File</Button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div key="error" className="flex flex-col items-center py-20 text-center"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 rounded-3xl bg-red-500/12 border border-red-500/25 flex items-center justify-center mb-5">
                <AlertCircle size={36} className="text-red-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">Import Failed</h3>
              <p className="text-sm font-body text-dark-400 mb-2 max-w-xs">{errorMsg}</p>
              <p className="text-xs font-body text-dark-600 mb-8 max-w-xs">Try a different file, or add your classes manually in the Timetable tab.</p>
              <Button fullWidth onClick={reset} icon={<RefreshCw size={16} />}>Try Again</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
