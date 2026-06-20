const paymentPlans = {
  verified: { amount: 19900, label: "Verified profile" },
  lead: { amount: 2000, label: "Lead unlock" },
  premium: { amount: 49900, label: "Premium listing" }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return json(500, { error: "Razorpay keys are not configured in Netlify." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const plan = paymentPlans[body.plan];
    if (!plan) {
      return json(400, { error: "Invalid payment plan." });
    }

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
          firebaseUid: body.firebaseUid || "",
          phone: body.phone || ""
        }
      })
    });

    const order = await response.json();
    if (!response.ok) {
      return json(response.status, { error: order.error?.description || "Razorpay order failed." });
    }

    return json(200, {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: body.plan
    });
  } catch (error) {
    return json(500, { error: error.message || "Could not create Razorpay order." });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
