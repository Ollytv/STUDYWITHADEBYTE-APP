"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledCampaigns = void 0;
// functions/src/scheduled.ts
const admin = __importStar(require("firebase-admin"));
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
    const now = admin.firestore.Timestamp.now();
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
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
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