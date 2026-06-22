import { DayOfWeek } from '../types';

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function getMinutesUntilClass(startTime: string): number {
  return timeToMinutes(startTime) - getCurrentTimeMinutes();
}

export function isClassNow(startTime: string, endTime: string): boolean {
  const now = getCurrentTimeMinutes();
  return now >= timeToMinutes(startTime) && now <= timeToMinutes(endTime);
}

export function isClassSoon(startTime: string, threshold = 30): boolean {
  const minutesUntil = getMinutesUntilClass(startTime);
  return minutesUntil > 0 && minutesUntil <= threshold;
}

export function isClassPast(endTime: string): boolean {
  return getCurrentTimeMinutes() > timeToMinutes(endTime);
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getDayOrder(): DayOfWeek[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
}

export function sortClassesByTime(classes: { startTime: string }[]): typeof classes {
  return [...classes].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}
