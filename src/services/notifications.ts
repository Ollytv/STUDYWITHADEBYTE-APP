import { CourseClass, NotificationSettings } from '../types';
import { timeToMinutes, getCurrentDayName, getCurrentTimeMinutes } from '../utils/time';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function scheduleClassNotifications(
  classes: CourseClass[],
  settings: NotificationSettings
): void {
  if (!settings.enabled || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const today = getCurrentDayName();
  const todayClasses = classes.filter(c => c.day === today);
  const nowMinutes = getCurrentTimeMinutes();

  for (const cls of todayClasses) {
    const classStartMinutes = timeToMinutes(cls.startTime);

    if (settings.tenMinsBefore) {
      const notifyAt = classStartMinutes - 10;
      if (notifyAt > nowMinutes) {
        scheduleNotification(cls, notifyAt - nowMinutes, '10 minutes');
      }
    }

    if (settings.thirtyMinsBefore) {
      const notifyAt = classStartMinutes - 30;
      if (notifyAt > nowMinutes) {
        scheduleNotification(cls, notifyAt - nowMinutes, '30 minutes');
      }
    }

    if (settings.oneHourBefore) {
      const notifyAt = classStartMinutes - 60;
      if (notifyAt > nowMinutes) {
        scheduleNotification(cls, notifyAt - nowMinutes, '1 hour');
      }
    }
  }
}

function scheduleNotification(
  cls: CourseClass,
  minutesFromNow: number,
  timeText: string
): void {
  const msFromNow = minutesFromNow * 60 * 1000;

  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`📚 ${cls.courseName} in ${timeText}`, {
        body: `${cls.courseCode} • ${cls.venue} • ${cls.startTime} - ${cls.endTime}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `class-${cls.id}-${timeText}`,
        // vibrate not in TS types
      });
    }
  }, msFromNow);
}

export function showInstantNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    // vibrate not in TS types
  });
}
