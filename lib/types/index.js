"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CGPA_SCALE = exports.CGPA_SCALE_OPTIONS = exports.DEFAULT_PROGRAM_LEVEL = exports.ALL_PROGRAM_LEVELS = exports.PROGRAM_LEVEL_META = void 0;
exports.getProgramLevelMeta = getProgramLevelMeta;
exports.PROGRAM_LEVEL_META = [
    // ── Primary levels ────────────────────────────────────────────────────
    { value: 'Foundation', label: 'Foundation / Pre-degree', shortLabel: 'Foundation', category: 'primary' },
    { value: 'Year 1', label: 'Year 1 (Level 100)', shortLabel: 'Year 1', category: 'primary', levelCode: '100' },
    { value: 'Year 2', label: 'Year 2 (Level 200)', shortLabel: 'Year 2', category: 'primary', levelCode: '200' },
    { value: 'Year 3', label: 'Year 3 (Level 300)', shortLabel: 'Year 3', category: 'primary', levelCode: '300' },
    { value: 'Year 4', label: 'Year 4 (Level 400)', shortLabel: 'Year 4', category: 'primary', levelCode: '400' },
    // ── Programme levels ──────────────────────────────────────────────────
    { value: 'Certificate', label: 'Certificate Level', shortLabel: 'Cert', category: 'programme' },
    { value: 'Diploma', label: 'Diploma Level', shortLabel: 'Diploma', category: 'programme' },
    { value: 'Advanced Diploma', label: 'Advanced Diploma Level', shortLabel: 'Adv. Dip', category: 'programme' },
];
/** All valid ProgramLevel values as a plain array — useful for runtime validation. */
exports.ALL_PROGRAM_LEVELS = exports.PROGRAM_LEVEL_META.map(m => m.value);
/** Default level assigned to new profiles. */
exports.DEFAULT_PROGRAM_LEVEL = 'Year 1';
exports.CGPA_SCALE_OPTIONS = [
    { value: 3.0, label: '3.0 Scale', display: '/ 3.0' },
    { value: 4.0, label: '4.0 Scale', display: '/ 4.0' },
    { value: 5.0, label: '5.0 Scale', display: '/ 5.0' },
];
/**
 * Default scale for existing users who pre-date this feature.
 * 5.0 preserves the previous hardcoded behaviour — no data loss.
 */
exports.DEFAULT_CGPA_SCALE = 5.0;
/** Look up display metadata for any level value. */
function getProgramLevelMeta(value) {
    return exports.PROGRAM_LEVEL_META.find(m => m.value === value) ?? exports.PROGRAM_LEVEL_META[1];
}
//# sourceMappingURL=index.js.map