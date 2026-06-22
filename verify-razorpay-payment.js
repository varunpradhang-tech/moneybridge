const crypto = require("crypto");
const admin = require("firebase-admin");

const paymentPlans = {
  verified: { amount: 19900 },
  lead: { amount: 2000 },
  premium: { amount: 49900 }
};

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured in Netlify.");
  }

  return {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return json(500, { error: "Razorpay secret is not configured in Netlify." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { orderId, paymentId, signature, plan } = body;
    if (!orderId || !paymentId || !signature || !plan) {
      return json(400, { error: "Missing payment verification details." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return json(400, { error: "Payment verification failed." });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      return json(orderResponse.status, { error: order.error?.description || "Could not verify Razorpay order." });
    }

    const planConfig = paymentPlans[plan];
    if (!planConfig || order.notes?.plan !== plan || order.amount !== planConfig.amount) {
      return json(400, { error: "Payment plan or amount does not match the order." });
    }

    const userId = order.notes?.firebaseUid;
    if (!userId) {
      return json(400, { error: "Payment order is not linked to a Firebase user." });
    }

    const db = getFirebaseAdmin();
    const userRef = db.collection("users").doc(userId);
    const paymentRef = db.collection("payments").doc(paymentId);
    const paymentData = {
      userId,
      plan,
      orderId,
      paymentId,
      amount: order.amount,
      currency: order.currency,
      status: "verified",
      provider: "razorpay",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

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

      transaction.set(paymentRef, paymentData, { merge: false });
      transaction.set(userRef, userUpdate, { merge: true });
    });

    return json(200, {
      verified: true,
      plan,
      orderId,
      paymentId,
      userId
    });
  } catch (error) {
    return json(500, { error: error.message || "Could not verify Razorpay payment." });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
