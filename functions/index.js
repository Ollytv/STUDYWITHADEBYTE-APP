const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Initialize the Admin SDK to allow backend control
if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.sendNotificationToAll = onRequest({ cors: true }, async (req, res) => {
  // Wrap in CORS handling so the browser doesn't block the 500 error payload
  cors(req, res, async () => {
    try {
      const payload = req.body.data?.payload || req.body.payload;
      
      if (!payload) {
        return res.status(400).send({ data: { error: "Missing notification payload." } });
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        // FCM requires topics or tokens; 'all' usually broadcasts to a global topic
        topic: "allUsers", 
      };

      if (payload.imageUrl) {
        message.notification.imageUrl = payload.imageUrl;
      }

      // Send the payload via Firebase Cloud Messaging
      const response = await admin.messaging().send(message);

      // Firebase Callables expect responses nested inside a 'data' object
      res.status(200).send({
        data: {
          successCount: 1,
          failureCount: 0,
          invalidTokensRemoved: 0,
          messageId: response
        }
      });

    } catch (error) {
      console.error("FCM Error detailed log:", error);
      res.status(500).send({ 
        data: { 
          error: error.message || "Internal server error running FCM wrapper." 
        } 
      });
    }
  });
});