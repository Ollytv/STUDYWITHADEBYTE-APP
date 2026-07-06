// functions/src/scheduled.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './admin';
import { dispatchNotification, NotificationTarget, NotificationPayloadInput } from './fcm';

/**
 * Runs every minute, picks up notificationCampaigns with status "pending"
 * and scheduledAt <= now, sends them, and marks status "sent" or "failed".
 * Campaigns are created client-side by the admin panel
 * (src/services/notificationAdmin.ts::scheduleNotificationCampaign).
 */
export const processScheduledCampaigns = onSchedule('every 1 minutes', async () => {
  const now = admin.firestore.Timestamp.now();

  const dueSnap = await db
    .collection('notificationCampaigns')
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', now)
    .limit(25) // cap per tick so one overloaded run doesn't block the next
    .get();

  if (dueSnap.empty) return;

  await Promise.all(
    dueSnap.docs.map(async campaignDoc => {
      const data = campaignDoc.data() as {
        target: NotificationTarget;
        payload: NotificationPayloadInput;
        createdBy: string;
      };

      // Claim the campaign first so a slow send can't be picked up twice by
      // an overlapping invocation.
      await campaignDoc.ref.update({ status: 'sending' });

      try {
        const result = await dispatchNotification(data.target, data.payload, data.createdBy, campaignDoc.id);
        await campaignDoc.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          result,
        });
      } catch (err) {
        console.error(`[scheduled] Campaign ${campaignDoc.id} failed:`, err);
        await campaignDoc.ref.update({
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );
});
