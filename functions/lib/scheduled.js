"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledCampaigns = void 0;
// functions/src/scheduled.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("./admin");
const fcm_1 = require("./fcm");
/**
 * Runs every minute, picks up notificationCampaigns with status "pending"
 * and scheduledAt <= now, sends them, and marks status "sent" or "failed".
 * Campaigns are created client-side by the admin panel
 * (src/services/notificationAdmin.ts::scheduleNotificationCampaign).
 */
exports.processScheduledCampaigns = (0, scheduler_1.onSchedule)('every 1 minutes', async () => {
    const now = admin_1.Timestamp.now();
    const dueSnap = await admin_1.db
        .collection('notificationCampaigns')
        .where('status', '==', 'pending')
        .where('scheduledAt', '<=', now)
        .limit(25) // cap per tick so one overloaded run doesn't block the next
        .get();
    if (dueSnap.empty)
        return;
    await Promise.all(dueSnap.docs.map(async (campaignDoc) => {
        const data = campaignDoc.data();
        // Claim the campaign first so a slow send can't be picked up twice by
        // an overlapping invocation.
        await campaignDoc.ref.update({ status: 'sending' });
        try {
            const result = await (0, fcm_1.dispatchNotification)(data.target, data.payload, data.createdBy, campaignDoc.id);
            await campaignDoc.ref.update({
                status: 'sent',
                sentAt: admin_1.FieldValue.serverTimestamp(),
                result,
            });
        }
        catch (err) {
            console.error(`[scheduled] Campaign ${campaignDoc.id} failed:`, err);
            await campaignDoc.ref.update({
                status: 'failed',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }));
});
//# sourceMappingURL=scheduled.js.map