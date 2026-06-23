const crypto = require("crypto");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const paymentPlans = {
  verified: { amount: 19900, label: "Verified profile" },
  lead: { amount: 2000, label: "Lead unlock" },
  premium: { amount: 49900, label: "Premium listing" }
};

exports.createRazorpayOrder = onRequest({ region: "asia-south1" }, async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return send(res, 500, { error: "Razorpay keys are not configured in Firebase Functions." });
  }

  try {
    const body = req.body || {};
    const plan = paymentPlans[body.plan];
    if (!plan) {
      return send(res, 400, { error: "Invalid payment plan." });
    }
    if (!body.idToken) {
      return send(res, 401, { error: "Please login with OTP before payment." });
    }

    const decodedToken = await admin.auth().verifyIdToken(body.idToken);
    const receipt = `mb_${body.plan}_${Date.now()}`.slice(0, 40);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: "INR",
        receipt,
        notes: {
          plan: body.plan,
          label: plan.label,
          firebaseUid: decodedToken.uid,
          phone: decodedToken.phone_number || body.phone || ""
        }
      })
    });

    const order = await response.json();
    if (!response.ok) {
      return send(res, response.status, { error: order.error?.description || "Razorpay order failed." });
    }

    return send(res, 200, {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: body.plan
    });
  } catch (error) {
    return send(res, 500, { error: error.message || "Could not create Razorpay order." });
  }
});

exports.verifyRazorpayPayment = onRequest({ region: "asia-south1" }, async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return send(res, 500, { error: "Razorpay keys are not configured in Firebase Functions." });
  }

  try {
    const body = req.body || {};
    const { orderId, paymentId, signature, plan } = body;
    if (!orderId || !paymentId || !signature || !plan) {
      return send(res, 400, { error: "Missing payment verification details." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return send(res, 400, { error: "Payment verification failed." });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      return send(res, orderResponse.status, { error: order.error?.description || "Could not verify Razorpay order." });
    }

    const planConfig = paymentPlans[plan];
    if (!planConfig || order.notes?.plan !== plan || order.amount !== planConfig.amount) {
      return send(res, 400, { error: "Payment plan or amount does not match the order." });
    }

    const userId = order.notes?.firebaseUid;
    if (!userId) {
      return send(res, 400, { error: "Payment order is not linked to a Firebase user." });
    }

    const userRef = db.collection("users").doc(userId);
    const paymentRef = db.collection("payments").doc(paymentId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const currentLeadCredits = Number(userSnapshot.exists ? userSnapshot.data().leadCredits || 0 : 0);
      const userUpdate = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPaymentAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (plan === "verified") {
        userUpdate.verifiedProfile = true;
      } else if (plan === "premium") {
        userUpdate.premium = true;
        userUpdate.premiumUntil = null;
      } else if (plan === "lead") {
        userUpdate.leadCredits = currentLeadCredits + 1;
      }

      transaction.set(paymentRef, {
        userId,
        plan,
        orderId,
        paymentId,
        amount: order.amount,
        currency: order.currency,
        status: "verified",
        provider: "razorpay",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: false });
      transaction.set(userRef, userUpdate, { merge: true });
    });

    return send(res, 200, {
      verified: true,
      plan,
      orderId,
      paymentId,
      userId
    });
  } catch (error) {
    return send(res, 500, { error: error.message || "Could not verify Razorpay payment." });
  }
});

exports.applyReferralRewards = onDocumentUpdated({
  region: "asia-south2",
  document: "users/{userId}"
}, async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const userId = event.params.userId;
  const referredByCode = normalizeReferralCode(after.referredByCode);
  const ownCode = normalizeReferralCode(after.referralCode);

  if (!referredByCode || referredByCode === ownCode) return;

  const kycIsApproved = after.kycStatus === "approved" || after.aadharVerified === true;
  const kycWasApproved = before.kycStatus === "approved" || before.aadharVerified === true;
  const shouldRewardKyc = kycIsApproved && !kycWasApproved && after.referralKycRewardGiven !== true;
  const shouldRewardVerifiedProfile = after.verifiedProfile === true
    && before.verifiedProfile !== true
    && after.referralVerifiedProfileRewardGiven !== true;

  if (!shouldRewardKyc && !shouldRewardVerifiedProfile) return;

  const referrerSnapshot = await db.collection("users")
    .where("referralCode", "==", referredByCode)
    .limit(1)
    .get();
  if (referrerSnapshot.empty) return;

  const referrerDoc = referrerSnapshot.docs[0];
  if (referrerDoc.id === userId) return;

  const referredUserRef = db.collection("users").doc(userId);
  const referrerRef = referrerDoc.ref;
  const rewardBatch = db.batch();
  const now = FieldValue.serverTimestamp();

  if (shouldRewardKyc) {
    rewardBatch.set(referrerRef, {
      leadCredits: FieldValue.increment(1),
      referralCreditsEarned: FieldValue.increment(1),
      updatedAt: now
    }, { merge: true });
    rewardBatch.set(referredUserRef, {
      leadCredits: FieldValue.increment(1),
      referralCreditsReceived: FieldValue.increment(1),
      referralKycRewardGiven: true,
      referredByUserId: referrerDoc.id,
      updatedAt: now
    }, { merge: true });
    rewardBatch.set(db.collection("referralRewards").doc(`${userId}_kyc`), {
      referrerId: referrerDoc.id,
      referredUserId: userId,
      referredByCode,
      creditsToReferrer: 1,
      creditsToNewUser: 1,
      reason: "otp_kyc_verified",
      createdAt: now
    }, { merge: false });
  }

  if (shouldRewardVerifiedProfile) {
    rewardBatch.set(referrerRef, {
      leadCredits: FieldValue.increment(2),
      referralCreditsEarned: FieldValue.increment(2),
      updatedAt: now
    }, { merge: true });
    rewardBatch.set(referredUserRef, {
      referralVerifiedProfileRewardGiven: true,
      referredByUserId: referrerDoc.id,
      updatedAt: now
    }, { merge: true });
    rewardBatch.set(db.collection("referralRewards").doc(`${userId}_verified_profile`), {
      referrerId: referrerDoc.id,
      referredUserId: userId,
      referredByCode,
      creditsToReferrer: 2,
      creditsToNewUser: 0,
      reason: "verified_profile_purchased",
      createdAt: now
    }, { merge: false });
  }

  await rewardBatch.commit();
});

function send(res, statusCode, body) {
  res.status(statusCode).set("Content-Type", "application/json").send(JSON.stringify(body));
}

function normalizeReferralCode(value = "") {
  return String(value).trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
}
