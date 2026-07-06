"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_GRADE_POINTS = void 0;
exports.scoreToGrade = scoreToGrade;
exports.resolveGradePoint = resolveGradePoint;
exports.calculateGPA = calculateGPA;
exports.normaliseGPA = normaliseGPA;
exports.getGPAClass = getGPAClass;
const types_1 = require("../types");
/**
 * Derive grade and grade point from a 0–100 score.
 * Grade points are on the 5.0 scale — they are normalised to other
 * scales only at display / GPA-class time, never at storage time.
 */
function scoreToGrade(score) {
    if (score >= 70)
        return { grade: 'A', gradePoint: 5.0 };
    if (score >= 60)
        return { grade: 'B', gradePoint: 4.0 };
    if (score >= 50)
        return { grade: 'C', gradePoint: 3.0 };
    if (score >= 45)
        return { grade: 'D', gradePoint: 2.0 };
    if (score >= 40)
        return { grade: 'E', gradePoint: 1.0 };
    return { grade: 'F', gradePoint: 0.0 };
}
/** Backward-compat lookup for old records saved with a letter grade but no score. */
exports.LEGACY_GRADE_POINTS = {
    'A': 5.0, 'AB': 4.5, 'B': 4.0, 'BC': 3.5,
    'C': 3.0, 'CD': 2.5, 'D': 2.0, 'E': 1.0, 'F': 0.0,
};
/** Resolve a grade point from score (new) or legacy grade string (old). */
function resolveGradePoint(score, grade) {
    if (score !== undefined)
        return scoreToGrade(score).gradePoint;
    return exports.LEGACY_GRADE_POINTS[grade] ?? 0;
}
// ─────────────────────────────────────────────────────────────────────────────
// GPA CALCULATION
// Grade points are always stored on the 5.0 scale internally.
// Normalisation to the student's school scale happens here.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calculate raw GPA on the 5.0 internal scale.
 * Pass the result through `normaliseGPA` before displaying.
 */
function calculateGPA(courses) {
    const totalUnits = courses.reduce((s, c) => s + c.creditUnits, 0);
    const totalPoints = courses.reduce((s, c) => s + c.creditUnits * c.gradePoint, 0);
    return totalUnits > 0 ? Math.round((totalPoints / totalUnits) * 100) / 100 : 0;
}
/**
 * Normalise a raw GPA (5.0 internal scale) to the student's school scale.
 *
 * Example:
 *   raw = 4.0 (on 5.0 scale)
 *   school scale = 4.0  →  normalised = 3.2
 *   school scale = 3.0  →  normalised = 2.4
 *   school scale = 5.0  →  normalised = 4.0  (no change)
 */
function normaliseGPA(rawGpa, scale = types_1.DEFAULT_CGPA_SCALE) {
    if (scale === 5.0)
        return rawGpa; // already on this scale
    return Math.round((rawGpa / 5.0) * scale * 100) / 100;
}
// ─────────────────────────────────────────────────────────────────────────────
// GPA CLASS  — thresholds scale with the student's school scale
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Return the academic standing label and colour for a given GPA.
 * Always pass a normalised GPA (already on `scale`) and the scale itself.
 *
 * Thresholds are expressed as a fraction of the scale max so they work
 * identically regardless of which scale the student's school uses:
 *   First Class   ≥ 90% of max  (4.5/5.0, 3.6/4.0, 2.7/3.0)
 *   Second Upper  ≥ 70%         (3.5/5.0, 2.8/4.0, 2.1/3.0)
 *   Second Lower  ≥ 50%         (2.5/5.0, 2.0/4.0, 1.5/3.0)
 *   Third Class   ≥ 30%         (1.5/5.0, 1.2/4.0, 0.9/3.0)
 *   Pass          ≥ 20%         (1.0/5.0, 0.8/4.0, 0.6/3.0)
 *   Fail          < 20%
 */
function getGPAClass(normalisedGpa, scale = types_1.DEFAULT_CGPA_SCALE) {
    const pct = normalisedGpa / scale; // fraction of max (0–1)
    if (pct >= 0.90)
        return { label: 'First Class', color: '#22c55e' };
    if (pct >= 0.70)
        return { label: 'Second Class Upper', color: '#3b82f6' };
    if (pct >= 0.50)
        return { label: 'Second Class Lower', color: '#f97316' };
    if (pct >= 0.30)
        return { label: 'Third Class', color: '#eab308' };
    if (pct >= 0.20)
        return { label: 'Pass', color: '#f87171' };
    return { label: 'Fail', color: '#ef4444' };
}
//# sourceMappingURL=gpa.js.map