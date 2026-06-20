const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
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

    return json(200, {
      verified: true,
      plan,
      orderId,
      paymentId
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
