const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors")({ origin: true });

// 1. Initialize the Firebase Admin SDK safely
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// CRITICAL FIX: Force the global Firestore engine instance to automatically 
// ignore any undefined properties instead of triggering a 500 crash.
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// 2. Helper function to completely remove undefined or empty string properties
function cleanPayload(obj) {
  const cleaned = {};
  if (!obj || typeof obj !== "object") return cleaned;
  
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      cleaned[key] = typeof obj[key] === "object" && !Array.isArray(obj[key]) 
        ? cleanPayload(obj[key]) 
        : obj[key];
    }
  });
  return cleaned;
}

// 3. Your core notification cloud function
exports.sendNotificationToAll = onRequest({ cors: true }, async (req, res) => {
  cors(req, res, async () => {
    try {
      // Extract the payload sent from your React app
      const rawPayload = req.body.data?.payload || req.body.payload;
      
      if (!rawPayload) {
        return res.status(400).send({ data: { error: "Missing notification payload." } });
      }

      // Manually clean the payload to wipe out any "undefined" keys completely
      const payload = cleanPayload(rawPayload);

      // Build a clean FCM broadcast message structure
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        topic: "allUsers",
      };

      // Only attach imageUrl if it actually exists as a valid string
      if (payload.imageUrl) {
        message.notification.imageUrl = payload.imageUrl;
      }

      // Dispatch notification live via FCM
      const fcmResponse = await admin.messaging().send(message);

      // Save a clean historical snapshot to Firestore log tracking safely
      await db.collection("notificationCampaigns").add({
        payload: payload,
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: req.auth?.uid || "admin_panel",
        fcmMessageId: fcmResponse
      });

      // Send a valid JSON success code back to the React client
      return res.status(200).send({
        data: {
          success: true,
          messageId: fcmResponse
        }
      });

    } catch (error) {
      console.error("Critical Cloud Function Exception:", error);
      return res.status(500).send({
        data: {
          error: error.message || "Internal server error processing dispatch history."
        }
      });
    }
  });
});