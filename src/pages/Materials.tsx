import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Download, FileText, Image, Link,
  StickyNote, Upload, ChevronLeft, Eye, X, Search,
  File, ExternalLink, AlertCircle, HardDrive,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { CourseMaterial } from '../types';
import { saveMaterialToIDB, getStorageWarning, getStorageUsage } from '../services/materialStorage';
import { Modal } from '../components/ui/Modal';
import { Input, Select, TextArea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SemesterSwitcher } from '../components/ui/SemesterSwitcher';
import { generateId } from '../utils/id';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

// ── Config ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<CourseMaterial['type'], {
  icon: React.ElementType; color: string; bg: string; border: string; label: string;
}> = {
  pdf:   { icon: FileText,   color: 'text-red-400',    bg: 'bg-red-500/12',    border: 'border-red-500/20',    label: 'PDF' },
  image: { icon: Image,      color: 'text-blue-400',   bg: 'bg-blue-500/12',   border: 'border-blue-500/20',   label: 'Image' },
  note:  { icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-500/12', border: 'border-yellow-500/20', label: 'Note' },
  link:  { icon: Link,       color: 'text-green-400',  bg: 'bg-green-500/12',  border: 'border-green-500/20',  label: 'Link' },
};

const MAX_FILE_MB = 20;

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Preview modal ──────────────────────────────────────────────────────────
function PreviewModal({ material, onClose }: { material: CourseMaterial; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-dark-950/80" onClick={e => e.stopPropagation()}>
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-sm font-display font-semibold text-white truncate">{material.name}</p>
          {material.courseCode && <p className="text-xs font-mono text-dark-400">{material.courseCode}</p>}
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-dark-800 border border-white/10 flex items-center justify-center text-dark-400 hover:text-white touch-manipulation">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-10" onClick={e => e.stopPropagation()}>
        {material.type === 'image' && (
          <img src={material.content} alt={material.name} className="w-full rounded-2xl object-contain max-h-[70vh]" />
        )}
        {material.type === 'pdf' && (
          <iframe src={material.content} className="w-full h-[70vh] rounded-2xl bg-white" title={material.name} />
        )}
        {material.type === 'note' && (
          <div className="bg-dark-800 border border-white/5 rounded-2xl p-5">
            <p className="text-sm font-body text-dark-200 leading-relaxed whitespace-pre-wrap">{material.content}</p>
          </div>
        )}
        {material.type === 'link' && (
          <div className="bg-dark-800 border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-4">
            <ExternalLink size={28} className="text-green-400" />
            <p className="text-sm font-body text-dark-300 text-center break-all">{material.content}</p>
            <button onClick={() => window.open(material.content, '_blank')}
              className="px-6 py-3 rounded-2xl bg-green-500 text-dark-950 font-display font-semibold text-sm touch-manipulation">
              Open Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Materials() {
  const { materials, addMaterial, deleteMaterial, activeSemester, activeAcademicYear, classes } = useStore();
  const navigate = useNavigate();

  const [showAdd, setShowAdd]           = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType]     = useState<CourseMaterial['type'] | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [previewing, setPreviewing]     = useState<CourseMaterial | null>(null);

  // File state — keep the actual File object separate from form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl]   = useState('');
  const [fileError, setFileError]       = useState('');

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus]     = useState<'idle' | 'reading' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError]       = useState('');

  const [form, setForm] = useState({
    name: '', courseCode: '', courseName: '',
    type: 'note' as CourseMaterial['type'], content: '',
  });

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Storage status ───────────────────────────────────────────────────────
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [storageUsedMB, setStorageUsedMB]   = useState(0);

  const refreshStorageStatus = async () => {
    const [warning, usage] = await Promise.all([getStorageWarning(), getStorageUsage()]);
    setStorageWarning(warning);
    setStorageUsedMB(Math.round(usage.totalBytes / 1024 / 1024 * 10) / 10);
  };

  useEffect(() => { refreshStorageStatus(); }, []);

  // materials from Zustand store — already loaded from IndexedDB by useStore.loadData
  const allMaterials = materials;

  // ── Derived ───────────────────────────────────────────────────────────────
  const courseOptions = useMemo(() => {
    const unique = new Map<string, string>();
    classes.forEach(c => unique.set(c.courseCode, c.courseName));
    return [
      { value: '', label: 'All Courses' },
      ...Array.from(unique).map(([code, name]) => ({ value: code, label: `${code} – ${name}` })),
    ];
  }, [classes]);

  const filtered = useMemo(() => {
    let list = allMaterials.filter(
      m => m.semester === activeSemester && m.academicYear === activeAcademicYear
    );
    if (filterCourse) list = list.filter(m => m.courseCode === filterCourse);
    if (filterType !== 'all') list = list.filter(m => m.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.courseCode || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [allMaterials, filterCourse, filterType, search, activeSemester, activeAcademicYear]);

  const typeCounts = useMemo(() => {
    const list = allMaterials.filter(
      m => m.semester === activeSemester && m.academicYear === activeAcademicYear
    );
    return {
      all: list.length,
      pdf: list.filter(m => m.type === 'pdf').length,
      image: list.filter(m => m.type === 'image').length,
      note: list.filter(m => m.type === 'note').length,
      link: list.filter(m => m.type === 'link').length,
    };
  }, [allMaterials, activeSemester, activeAcademicYear]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = () => {
    setForm({ name: '', courseCode: '', courseName: '', type: 'note', content: '' });
    setSelectedFile(null);
    setFileDataUrl('');
    setFileError('');
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── File selection ────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setFileError('');
    setUploadStatus('idle');

    // Check size — warn but don't block (materialStorage.ts enforces the hard limit)
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File is ${formatBytes(file.size)}. Large files may take longer to upload.`);
    }

    setUploadStatus('reading');
    setSelectedFile(file);

    // Read as data URL for preview only — actual upload uses the File object
    const reader = new FileReader();
    reader.onload = e => {
      setFileDataUrl(e.target?.result as string);
      setUploadStatus('idle');
    };
    reader.onerror = () => {
      setFileError('Could not read file. Please try again.');
      setUploadStatus('idle');
    };
    reader.readAsDataURL(file);

    // Auto-fill name from filename
    setForm(f => ({
      ...f,
      name: f.name || file.name.replace(/\.[^/.]+$/, ''), // strip extension
      type: file.type.includes('pdf') ? 'pdf' : 'image',
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) return;

    const isFileType = form.type === 'pdf' || form.type === 'image';
    const isTextType = form.type === 'note' || form.type === 'link';

    if (isFileType && !selectedFile && !fileDataUrl) {
      setFileError('Please select a file to upload.');
      return;
    }
    if (isTextType && !form.content.trim()) {
      setUploadError('Please enter content before saving.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');

    try {
      const linkedClass = classes.find(c => c.courseCode === form.courseCode);
      const id = generateId();

      const material: CourseMaterial = {
        id,
        name:         form.name.trim(),
        courseCode:   form.courseCode,
        courseName:   linkedClass?.courseName || form.courseName,
        type:         form.type,
        // For file types: pass the data URL — materialStorage.ts converts to ArrayBuffer
        // For text/link: use content directly
        content:      isFileType ? fileDataUrl : form.content.trim(),
        size:         selectedFile?.size,
        semester:     activeSemester,
        academicYear: activeAcademicYear,
        createdAt:    new Date().toISOString(),
      };

      // Show progress animation — IDB writes are fast but give user feedback
      setUploadProgress(30);
      const savedMeta = await saveMaterialToIDB(material);
      setUploadProgress(90);

      // Reconstruct the material with a fresh blob: URL for immediate display.
      // For file types, re-use the data URL we already have in memory as the
      // content for this session — getMaterialsFromIDB() will create a proper
      // blob: URL on next reload. For text/link, content is already correct.
      const displayMaterial: CourseMaterial = {
        ...material,
        size: savedMeta.size, // use the byte-accurate size from IDB
      };

      // Optimistically add to store so the list updates immediately
      addMaterial(displayMaterial);

      setUploadProgress(100);
      setUploadStatus('done');

      // Refresh storage badge
      await refreshStorageStatus();

      setTimeout(() => {
        setShowAdd(false);
        resetAll();
      }, 500);

    } catch (e: any) {
      console.error('saveMaterial error:', e);
      setUploadStatus('error');
      setUploadError(
        e?.message?.includes('too large')
          ? e.message
          : e?.message?.includes('Storage limit')
          ? e.message
          : `Save failed: ${e?.message || 'Unknown error'}. Please try again.`
      );
      setUploadProgress(0);
    }
  };

  const handleTypeChange = (type: CourseMaterial['type']) => {
    setForm(f => ({ ...f, type, content: '' }));
    setSelectedFile(null);
    setFileDataUrl('');
    setFileError('');
    setUploadStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownload = (m: CourseMaterial) => {
    if (m.type === 'link') { window.open(m.content, '_blank'); return; }
    const a = document.createElement('a');
    a.href = m.content;
    a.download = m.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isSaving = uploadStatus === 'uploading' || uploadStatus === 'reading';
  const canSave = form.name.trim() && (
    ((form.type === 'pdf' || form.type === 'image') && (selectedFile || fileDataUrl)) ||
    ((form.type === 'note' || form.type === 'link') && form.content.trim())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-dark-950 pb-24">
        {/* Header */}
        <div className="px-4 pt-14 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(ROUTES.app.more)}
                className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors touch-manipulation">
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Course Materials</h1>
                <p className="text-xs text-dark-400 font-body">
                  {typeCounts.all} file{typeCounts.all !== 1 ? 's' : ''}
                  {storageUsedMB > 0 && (
                    <span className="ml-1 text-dark-600">· {storageUsedMB} MB used</span>
                  )}
                </p>
              </div>
            </div>
            <motion.button onClick={() => { resetAll(); setShowAdd(true); }}
              className="w-11 h-11 rounded-2xl bg-green-500 flex items-center justify-center shadow-green-glow touch-manipulation"
              whileTap={{ scale: 0.92 }}>
              <Plus size={20} className="text-dark-950" />
            </motion.button>
          </div>
        </div>

        <SemesterSwitcher />

        {/* Storage warning banner */}
        {storageWarning && (
          <div className="mx-4 mb-3 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
            <HardDrive size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400 font-body">{storageWarning}</p>
          </div>
        )}

        {/* Search */}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-3 bg-dark-800 border border-white/5 rounded-2xl px-4 py-3 focus-within:border-green-500/30 transition-colors">
            <Search size={15} className="text-dark-500 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
              className="flex-1 bg-transparent text-sm font-body text-white placeholder:text-dark-600 focus:outline-none" />
            {search && <button onClick={() => setSearch('')} className="text-dark-500 hover:text-white touch-manipulation"><X size={14} /></button>}
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide">
          {(['all', 'pdf', 'image', 'note', 'link'] as const).map(type => {
            const label = type === 'all' ? 'All' : TYPE_CONFIG[type].label + 's';
            const count = typeCounts[type];
            const active = filterType === type;
            const cfg = type !== 'all' ? TYPE_CONFIG[type] : null;
            return (
              <button key={type} onClick={() => setFilterType(type)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-body font-semibold border transition-all flex items-center gap-1.5 touch-manipulation ${
                  active ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-dark-800 border-white/5 text-dark-500'
                }`}>
                {cfg && <cfg.icon size={11} className={active ? 'text-green-400' : cfg.color} />}
                {label} <span className={active ? 'text-green-500' : 'text-dark-600'}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Course filter */}
        <div className="px-4 mb-4">
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            className="w-full bg-dark-800 border border-white/5 rounded-2xl text-sm font-body text-dark-300 px-4 py-3 focus:outline-none appearance-none touch-manipulation">
            {courseOptions.map(o => <option key={o.value} value={o.value} className="bg-dark-800">{o.label}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="px-4 space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState icon={<Upload size={28} />}
              title={search || filterCourse || filterType !== 'all' ? 'No matches found' : 'No materials yet'}
              description="Upload PDFs, images, save links and write notes for your courses."
              action={!search && !filterCourse && filterType === 'all'
                ? { label: 'Add first material', onClick: () => { resetAll(); setShowAdd(true); } }
                : undefined}
            />
          ) : (
            filtered.map((m, i) => {
              const cfg = TYPE_CONFIG[m.type];
              const Icon = cfg.icon;
              return (
                <motion.div key={m.id}
                  className={`bg-dark-800 border ${cfg.border} rounded-2xl p-4 flex items-center gap-3`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className={`w-11 h-11 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-white truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {m.courseCode && <span className="text-xs font-mono text-dark-400">{m.courseCode}</span>}
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      {m.size && <span className="text-xs text-dark-600">{formatBytes(m.size)}</span>}
                      {m.createdAt && <span className="text-xs text-dark-600">{formatDate(m.createdAt)}</span>}
                    </div>
                    {m.type === 'note' && <p className="text-xs text-dark-500 mt-1 line-clamp-1">{m.content}</p>}
                    {m.type === 'link' && <p className="text-xs text-dark-500 mt-1 truncate">{m.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(m.type === 'note' || m.type === 'link' || m.type === 'image' || m.type === 'pdf') && (
                      <button onClick={() => setPreviewing(m)}
                        className="p-2 rounded-xl hover:bg-white/8 text-dark-400 hover:text-white transition-colors touch-manipulation">
                        <Eye size={15} />
                      </button>
                    )}
                    {(m.type === 'pdf' || m.type === 'image') && (
                      <button onClick={() => handleDownload(m)}
                        className="p-2 rounded-xl hover:bg-white/8 text-dark-400 hover:text-white transition-colors touch-manipulation">
                        <Download size={15} />
                      </button>
                    )}
                    {m.type === 'link' && (
                      <button onClick={() => window.open(m.content, '_blank')}
                        className="p-2 rounded-xl hover:bg-white/8 text-dark-400 hover:text-white transition-colors touch-manipulation">
                        <ExternalLink size={15} />
                      </button>
                    )}
                    <button onClick={() => deleteMaterial(m.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-dark-600 hover:text-red-400 transition-colors touch-manipulation">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Preview overlay */}
      <AnimatePresence>
        {previewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PreviewModal material={previewing} onClose={() => setPreviewing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add material modal */}
      <Modal isOpen={showAdd} onClose={() => { if (!isSaving) { setShowAdd(false); resetAll(); } }} title="Add Material">
        <div className="p-5 space-y-4 pb-10">

          {/* Type selector */}
          <div>
            <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-2">Type</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(TYPE_CONFIG) as [CourseMaterial['type'], typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                const active = form.type === type;
                return (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-body font-semibold transition-all touch-manipulation ${
                      active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-dark-800 border-white/5 text-dark-500'
                    }`}>
                    <Icon size={18} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File upload zone */}
          {(form.type === 'pdf' || form.type === 'image') && (
            <div>
              <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-2">
                {form.type === 'pdf' ? 'PDF File' : 'Image File'}
              </p>
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all touch-manipulation ${
                  selectedFile ? 'border-green-500/40 bg-green-500/5' : 'border-white/15 hover:border-green-500/30'
                }`}
                onClick={() => !isSaving && fileRef.current?.click()}
              >
                {uploadStatus === 'reading' ? (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                    <p className="text-sm text-dark-400 font-body">Reading file…</p>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/15 flex items-center justify-center">
                      <File size={18} className="text-green-400" />
                    </div>
                    <p className="text-sm text-green-400 font-body font-semibold truncate max-w-[220px]">{selectedFile.name}</p>
                    <p className="text-xs text-dark-500 font-body">{formatBytes(selectedFile.size)} · Tap to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className="text-dark-500" />
                    <p className="text-sm text-dark-400 font-body">Tap to select {form.type === 'pdf' ? 'PDF' : 'image'}</p>
                    <p className="text-xs text-dark-600 font-body">Up to {MAX_FILE_MB}MB recommended</p>
                  </div>
                )}
              </div>
              {fileError && (
                <p className="text-xs text-yellow-400 font-body mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {fileError}
                </p>
              )}
              <input ref={fileRef} type="file" className="hidden"
                accept={form.type === 'pdf' ? '.pdf,application/pdf' : 'image/*'}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            </div>
          )}

          {/* Link URL */}
          {form.type === 'link' && (
            <Input label="URL" value={form.content}
              onChange={v => setForm(f => ({ ...f, content: v, name: f.name || v }))}
              placeholder="https://..." type="url" />
          )}

          {/* Note */}
          {form.type === 'note' && (
            <TextArea label="Note Content" value={form.content}
              onChange={v => setForm(f => ({ ...f, content: v }))}
              placeholder="Write your notes here…" rows={5} />
          )}

          {/* Name */}
          <Input label="Name / Title" value={form.name}
            onChange={v => setForm(f => ({ ...f, name: v }))}
            placeholder="e.g. Week 3 Lecture Notes" />

          {/* Course */}
          <Select label="Course (optional)" value={form.courseCode}
            onChange={v => {
              const c = classes.find(c => c.courseCode === v);
              setForm(f => ({ ...f, courseCode: v, courseName: c?.courseName || '' }));
            }}
            options={[
              { value: '', label: 'No specific course' },
              ...classes.map(c => ({ value: c.courseCode, label: `${c.courseCode} – ${c.courseName}` })),
            ]} />

          {/* Upload progress bar */}
          {(uploadStatus === 'uploading' || uploadStatus === 'done') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-body text-dark-400">
                  {uploadStatus === 'done' ? '✅ Saved!' : 'Saving to device…'}
                </p>
                <p className="text-xs font-mono text-green-400">{uploadProgress}%</p>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500 rounded-full"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {uploadStatus === 'error' && uploadError && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 font-body">{uploadError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => { if (!isSaving) { setShowAdd(false); resetAll(); } }}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave} disabled={isSaving || !canSave}>
              {uploadStatus === 'uploading' ? 'Uploading…' : uploadStatus === 'done' ? 'Saved! ✅' : 'Save Material'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}