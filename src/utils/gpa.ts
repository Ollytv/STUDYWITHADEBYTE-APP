export const GRADE_POINTS: Record<string, number> = {
  'A': 5.0, 'AB': 4.5, 'B': 4.0, 'BC': 3.5,
  'C': 3.0, 'CD': 2.5, 'D': 2.0, 'E': 1.0, 'F': 0.0,
};

export const GRADE_OPTIONS = Object.keys(GRADE_POINTS).map(g => ({ value: g, label: `${g} (${GRADE_POINTS[g]})` }));

export function calculateGPA(courses: { creditUnits: number; gradePoint: number }[]): number {
  const totalUnits = courses.reduce((s, c) => s + c.creditUnits, 0);
  const totalPoints = courses.reduce((s, c) => s + c.creditUnits * c.gradePoint, 0);
  return totalUnits > 0 ? Math.round((totalPoints / totalUnits) * 100) / 100 : 0;
}

export function getGPAClass(gpa: number): { label: string; color: string } {
  if (gpa >= 4.5) return { label: 'First Class', color: '#22c55e' };
  if (gpa >= 3.5) return { label: 'Second Class Upper', color: '#3b82f6' };
  if (gpa >= 2.5) return { label: 'Second Class Lower', color: '#f97316' };
  if (gpa >= 1.5) return { label: 'Third Class', color: '#eab308' };
  if (gpa >= 1.0) return { label: 'Pass', color: '#f87171' };
  return { label: 'Fail', color: '#ef4444' };
}
