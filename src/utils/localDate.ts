/**
 * "YYYY-MM-DD" for a moment in the user's LOCAL timezone.
 *
 * Don't use `new Date().toISOString().split('T')[0]` for "today": that gives
 * the UTC date, which is already tomorrow (or still yesterday) for a few hours
 * every day for anyone not on UTC.
 */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local "YYYY-MM-DD" for `days` days before today (calendar days, DST-safe). */
export function localDateDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  return localDateISO(d);
}
