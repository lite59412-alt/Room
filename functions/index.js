/**
 * RoomieKhata — background push sender (Firebase Cloud Functions v2).
 *
 * Fires on Firestore writes and sends a *data-only* FCM web-push to the right people, so the phone
 * shows a status-bar notification even when the app is closed / the screen is locked:
 *   1. expense created            → every roommate EXCEPT the one who added it
 *   2. settlement request created → ONLY the receiver
 *   3. request approved / rejected → ONLY the payer
 *
 * Deploy (needs the Blaze plan):  firebase deploy --only functions
 */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

const PENDING = 'pending_receiver_approval';
const inr = (n) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n) || 0);

async function loadRoom(code) {
  const snap = await db.doc(`rooms/${code}`).get();
  return snap.exists ? snap.data() : null;
}

const nameOf = (room, uid) => ((room && room.members) || []).find((m) => m.id === uid)?.name || 'A roommate';

async function send(uids, { type, body, tab, tag }) {
  const targets = [...new Set(uids.filter(Boolean))];
  if (!targets.length) return;

  // collect device tokens of the target users only
  const owners = new Map(); // token -> uid
  await Promise.all(
    targets.map(async (uid) => {
      const u = await db.doc(`users/${uid}`).get();
      ((u.exists && u.data().fcmTokens) || []).forEach((t) => owners.set(t, uid));
    }),
  );
  const tokens = [...owners.keys()];
  if (!tokens.length) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { type, title: 'RoomieKhata', body, url: `/?tab=${tab}`, tag: tag || '' },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  });

  // drop dead tokens
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') dead.push(tokens[i]);
  });
  await Promise.all(dead.map((t) => db.doc(`users/${owners.get(t)}`).set({ fcmTokens: FieldValue.arrayRemove(t) }, { merge: true })));
}

// 1) New expense → everyone except the person who added it
exports.onExpenseAdded = onDocumentCreated('rooms/{code}/expenses/{id}', async (event) => {
  const e = event.data && event.data.data();
  if (!e) return;
  const room = await loadRoom(event.params.code);
  if (!room) return;
  const actor = e.addedBy || e.paidById;
  const who = e.addedByName || nameOf(room, actor);
  await send((room.memberIds || []).filter((id) => id !== actor), {
    type: 'expense',
    body: `${who} ne ${inr(e.amount)} ka kharcha add kiya (${e.title || 'Kharcha'}).`,
    tab: 'activity',
    tag: `exp-${event.params.id}`,
  });
});

// 2) Settlement request → ONLY the receiver
exports.onSettlementRequested = onDocumentCreated('rooms/{code}/settlements/{id}', async (event) => {
  const s = event.data && event.data.data();
  if (!s || s.status !== PENDING) return;
  const room = await loadRoom(event.params.code);
  if (!room) return;
  await send([s.toId], {
    type: 'settlement_request',
    body: `${nameOf(room, s.fromId)} claims to have paid you ${inr(s.amount)}. Tap to approve.`,
    tab: 'settlements',
    tag: `set-${event.params.id}`,
  });
});

// 3) Approved / rejected → ONLY the payer
exports.onSettlementDecided = onDocumentUpdated('rooms/{code}/settlements/{id}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after || before.status !== PENDING || after.status === PENDING) return;
  const room = await loadRoom(event.params.code);
  if (!room) return;
  const receiver = nameOf(room, after.toId);

  if (after.status === 'settled') {
    await send([after.fromId], {
      type: 'settlement_approved',
      body: after.forced
        ? `Admin approved your ${inr(after.amount)} payment to ${receiver}. Hisab clear ho gaya!`
        : `${receiver} confirmed your ${inr(after.amount)} payment. Hisab clear ho gaya!`,
      tab: 'settlements',
      tag: `set-${event.params.id}`,
    });
  } else if (after.status === 'rejected') {
    await send([after.fromId], {
      type: 'settlement_rejected',
      body: `${receiver} marked your ${inr(after.amount)} payment as NOT received. The debt is still pending.`,
      tab: 'settlements',
      tag: `set-${event.params.id}`,
    });
  }
});
