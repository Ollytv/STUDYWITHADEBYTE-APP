import { useState, useEffect } from 'react';
import { CourseClass, DayOfWeek, ProgramLevel, ColorLabel } from '../../types';
import { useStore } from '../../hooks/useStore';
import { Modal } from '../ui/Modal';
import { Input, Select, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { COLOR_OPTIONS } from '../../utils/colors';

const DAYS: DayOfWeek[] = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const LEVELS: ProgramLevel[] = ['ND1','ND2','HND1','HND2','Part-Time ND1','Part-Time ND2','Part-Time HND1','Part-Time HND2'];
const DEPARTMENTS = ['Computer Science','Business Administration','Accountancy','Electrical/Electronics Engineering','Mechanical Engineering','Civil Engineering','Mass Communication','Public Administration','Marketing','Banking & Finance','Science Laboratory Technology','Statistics','Architecture','Quantity Surveying','Other'];

function emptyForm(): Partial<CourseClass> {
  return { courseName:'', courseCode:'', lecturer:'', day:'Monday', startTime:'08:00', endTime:'10:00', venue:'', department:'', programLevel:'ND1', colorLabel:'green', notes:'' };
}

export function ClassForm({ isOpen, onClose, editClass }: { isOpen: boolean; onClose: () => void; editClass?: CourseClass | null }) {
  const { addClass, updateClass, profile, activeSemester, activeAcademicYear } = useStore();
  const [form, setForm] = useState<Partial<CourseClass>>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editClass) setForm(editClass);
      else setForm({ ...emptyForm(), department: profile?.department || '', programLevel: profile?.programLevel || 'ND1' });
    }
  }, [editClass, isOpen, profile]);

  const set = (field: keyof CourseClass, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!form.courseName?.trim() || !form.courseCode?.trim()) return;
    setSaving(true);
    try {
      if (editClass) {
        await updateClass(editClass.id, form);
      } else {
        await addClass({
          courseName: form.courseName!.trim(),
          courseCode: form.courseCode!.trim().toUpperCase(),
          lecturer: form.lecturer || 'TBD',
          day: form.day as DayOfWeek,
          startTime: form.startTime || '08:00',
          endTime: form.endTime || '10:00',
          venue: form.venue || 'TBD',
          department: form.department || '',
          programLevel: (form.programLevel || 'ND1') as ProgramLevel,
          colorLabel: (form.colorLabel || 'green') as ColorLabel,
          totalClassesHeld: 0, totalClassesAttended: 0, attendancePercentage: 0,
          notes: form.notes || '',
          semester: activeSemester,
          academicYear: activeAcademicYear,
        });
      }
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editClass ? 'Edit Class' : 'Add New Class'} fullHeight>
      <div className="p-5 space-y-5">
        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Course Info</p>
          <Input label="Course Name" value={form.courseName || ''} onChange={v => set('courseName', v)} placeholder="e.g. Introduction to Programming" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" value={form.courseCode || ''} onChange={v => set('courseCode', v)} placeholder="e.g. CSC101" required />
            <Input label="Lecturer" value={form.lecturer || ''} onChange={v => set('lecturer', v)} placeholder="e.g. Dr. Adebayo" />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Schedule</p>
          <Select label="Day" value={form.day || 'Monday'} onChange={v => set('day', v)}
            options={DAYS.map(d => ({ value: d, label: d }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.startTime || '08:00'} onChange={v => set('startTime', v)} required />
            <Input label="End Time" type="time" value={form.endTime || '10:00'} onChange={v => set('endTime', v)} required />
          </div>
          <Input label="Venue" value={form.venue || ''} onChange={v => set('venue', v)} placeholder="e.g. Hall 3, Lab 2" />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Academic Info</p>
          <Select label="Department" value={form.department || ''}  onChange={v => set('department', v)}
            options={[{ value: '', label: 'Select department...' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} />
          <Select label="Program Level" value={form.programLevel || 'ND1'} onChange={v => set('programLevel', v)}
            options={LEVELS.map(l => ({ value: l, label: l }))} />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Color Label</p>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map(color => (
              <button key={color.value} onClick={() => set('colorLabel', color.value)}
                className={`w-9 h-9 rounded-full transition-all duration-150 ${form.colorLabel === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color.hex }} title={color.label}
              />
            ))}
          </div>
        </div>

        <TextArea label="Notes (Optional)" value={form.notes || ''} onChange={v => set('notes', v)} placeholder="Any additional notes..." rows={2} />

        {/* Fixed action buttons — always visible */}
        <div className="flex gap-3 pt-2 pb-8">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth onClick={handleSubmit} disabled={saving || !form.courseName?.trim() || !form.courseCode?.trim()}>
            {saving ? 'Saving...' : editClass ? 'Update Class' : 'Add Class'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
