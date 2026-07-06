"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassForm = ClassForm;
const react_1 = require("react");
const types_1 = require("../../types");
const useStore_1 = require("../../hooks/useStore");
const Modal_1 = require("../ui/Modal");
const Input_1 = require("../ui/Input");
const Button_1 = require("../ui/Button");
const colors_1 = require("../../utils/colors");
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEVEL_OPTIONS = types_1.PROGRAM_LEVEL_META.map(m => ({ value: m.value, label: m.label }));
const DEPARTMENTS = ['Computer Science', 'Business Administration', 'Accountancy', 'Electrical/Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Mass Communication', 'Public Administration', 'Marketing', 'Banking & Finance', 'Science Laboratory Technology', 'Statistics', 'Architecture', 'Quantity Surveying', 'Other'];
function emptyForm() {
    return { courseName: '', courseCode: '', lecturer: '', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: '', department: '', programLevel: types_1.DEFAULT_PROGRAM_LEVEL, colorLabel: 'green', notes: '' };
}
function ClassForm({ isOpen, onClose, editClass }) {
    const { addClass, updateClass, profile, activeSemester, activeAcademicYear } = (0, useStore_1.useStore)();
    const [form, setForm] = (0, react_1.useState)(emptyForm());
    const [saving, setSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            if (editClass)
                setForm(editClass);
            else
                setForm({ ...emptyForm(), department: profile?.department || '', programLevel: profile?.programLevel || types_1.DEFAULT_PROGRAM_LEVEL });
        }
    }, [editClass, isOpen, profile]);
    const set = (field, value) => setForm(p => ({ ...p, [field]: value }));
    const handleSubmit = async () => {
        if (!form.courseName?.trim() || !form.courseCode?.trim())
            return;
        setSaving(true);
        try {
            if (editClass) {
                await updateClass(editClass.id, form);
            }
            else {
                await addClass({
                    courseName: form.courseName.trim(),
                    courseCode: form.courseCode.trim().toUpperCase(),
                    lecturer: form.lecturer || 'TBD',
                    day: form.day,
                    startTime: form.startTime || '08:00',
                    endTime: form.endTime || '10:00',
                    venue: form.venue || 'TBD',
                    department: form.department || '',
                    programLevel: (form.programLevel || types_1.DEFAULT_PROGRAM_LEVEL),
                    colorLabel: (form.colorLabel || 'green'),
                    totalClassesHeld: 0, totalClassesAttended: 0, attendancePercentage: 0,
                    notes: form.notes || '',
                    semester: activeSemester,
                    academicYear: activeAcademicYear,
                });
            }
            onClose();
        }
        finally {
            setSaving(false);
        }
    };
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title={editClass ? 'Edit Class' : 'Add New Class'} fullHeight>
      <div className="p-5 space-y-5">
        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Course Info</p>
          <Input_1.Input label="Course Name" value={form.courseName || ''} onChange={v => set('courseName', v)} placeholder="e.g. Introduction to Programming" required/>
          <div className="grid grid-cols-2 gap-3">
            <Input_1.Input label="Course Code" value={form.courseCode || ''} onChange={v => set('courseCode', v)} placeholder="e.g. CSC101" required/>
            <Input_1.Input label="Lecturer" value={form.lecturer || ''} onChange={v => set('lecturer', v)} placeholder="e.g. Dr. Adebayo"/>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Schedule</p>
          <Input_1.Select label="Day" value={form.day || 'Monday'} onChange={v => set('day', v)} options={DAYS.map(d => ({ value: d, label: d }))} required/>
          <div className="grid grid-cols-2 gap-3">
            <Input_1.Input label="Start Time" type="time" value={form.startTime || '08:00'} onChange={v => set('startTime', v)} required/>
            <Input_1.Input label="End Time" type="time" value={form.endTime || '10:00'} onChange={v => set('endTime', v)} required/>
          </div>
          <Input_1.Input label="Venue" value={form.venue || ''} onChange={v => set('venue', v)} placeholder="e.g. Hall 3, Lab 2"/>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Academic Info</p>
          <Input_1.Select label="Department" value={form.department || ''} onChange={v => set('department', v)} options={[{ value: '', label: 'Select department...' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]}/>
          <Input_1.Select label="Academic Level" value={form.programLevel || types_1.DEFAULT_PROGRAM_LEVEL} onChange={v => set('programLevel', v)} options={LEVEL_OPTIONS}/>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">Color Label</p>
          <div className="flex flex-wrap gap-3">
            {colors_1.COLOR_OPTIONS.map(color => (<button key={color.value} onClick={() => set('colorLabel', color.value)} className={`w-9 h-9 rounded-full transition-all duration-150 ${form.colorLabel === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: color.hex }} title={color.label}/>))}
          </div>
        </div>

        <Input_1.TextArea label="Notes (Optional)" value={form.notes || ''} onChange={v => set('notes', v)} placeholder="Any additional notes..." rows={2}/>

        {/* Fixed action buttons — always visible */}
        <div className="flex gap-3 pt-2 pb-8">
          <Button_1.Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button_1.Button>
          <Button_1.Button fullWidth onClick={handleSubmit} disabled={saving || !form.courseName?.trim() || !form.courseCode?.trim()}>
            {saving ? 'Saving...' : editClass ? 'Update Class' : 'Add Class'}
          </Button_1.Button>
        </div>
      </div>
    </Modal_1.Modal>);
}
//# sourceMappingURL=ClassForm.js.map