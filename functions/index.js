// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// When a new message is created under conversations/{convId}/messages/{msgId}
exports.onMessageCreate = functions.database
  .ref("/conversations/{convId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const msg = snap.val();
    const convId = context.params.convId;
    if (!msg || !msg.sender) return null;

    // load conversation to find participants
    const convSnap = await admin.database().ref(`/conversations/${convId}`).once("value");
    const conv = convSnap.val();
    if (!conv) return null;

    const recipient = conv.user1 === msg.sender ? conv.user2 : conv.user1;
    if (!recipient) return null;

    // get recipient tokens
    const tokensSnap = await admin.database().ref(`/usertokens/${recipient}`).once("value");
    const tokensObj = tokensSnap.val();
    if (!tokensObj) return null;
    const tokens = Object.keys(tokensObj);

    if (tokens.length === 0) return null;

    // get sender profile for notification title
    const senderProfile = await admin.database().ref(`/userprofiles/${msg.sender}`).once("value");
    const senderName = senderProfile.exists() ? senderProfile.val().name : "Someone";

    const payload = {
      notification: {
        title: `${senderName}`,
        body: msg.text ? (msg.text.length > 80 ? msg.text.slice(0, 77) + "..." : msg.text) : "Sent a message",
      },
      data: {
        conversationId: convId,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    return admin.messaging().sendToDevice(tokens, payload);
  });

// When a new match entry is created:
exports.onNewMatch = functions.database
  .ref("/usermatches/{matchId}")
  .onCreate(async (snap, ctx) => {
    const match = snap.val();
    if (!match) return null;

    // notify both users (or only the other user of the match)
    const { user1, user2 } = match;
    // send to both or to one — here we send to user2 as "you have a match" for demo
    const recipient = user2; // adjust logic as you need

    const tokensSnap = await admin.database().ref(`/usertokens/${recipient}`).once("value");
    const tokensObj = tokensSnap.val();
    if (!tokensObj) return null;
    const tokens = Object.keys(tokensObj);

    const payload = {
      notification: {
        title: "New Match!",
        body: "You have a new match. Start chatting now 💬",
      },
      data: { matchId: ctx.params.matchId },
    };

    return admin.messaging().sendToDevice(tokens, payload);
  });
