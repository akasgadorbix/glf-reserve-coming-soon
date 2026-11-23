
const { validateToken } = require("./_token");

const validFragrances = new Set([
  "Santal Reserve",
  "Citrus Hinoki",
  "Amber Coast",
  "FREE"
]);

function clean(value, max = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      success: false,
      error: "Invalid form submission"
    });
  }

  // Verify the personal welcome link
  const verified = validateToken(body.token);

  if (!verified) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired welcome link"
    });
  }

  // Email comes from verified token, not user input
  const data = {
    name: clean(body.fullName, 120),
    email: verified.email,
    fragrance: clean(body.fragrance, 60),
    address: clean(body.address, 500),
    city: clean(body.city, 100),
    state: clean(body.state, 100),
    postal: clean(body.postal, 40),
    country: clean(body.country, 100)
  };

  if (
    !data.name ||
    !validFragrances.has(data.fragrance) ||
    !data.address ||
    !data.city ||
    !data.state ||
    !data.postal ||
    !data.country
  ) {
    return res.status(400).json({
      success: false,
      error: "Please complete all required fields"
    });
  }

  const scriptUrl = process.env.GLF_SHEET_WEBAPP_URL;
  const secret = process.env.GLF_API_SECRET;

  if (!scriptUrl || !secret) {
    return res.status(503).json({
      success: false,
      error: "Welcome Kit Sheet is not configured"
    });
  }

  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/
      .test(scriptUrl)
  ) {
    return res.status(503).json({
      success: false,
      error: "Invalid Google Apps Script URL"
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        ...data,
        secret
      }),
      redirect: "follow",
      signal: controller.signal
    });

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch (_) {
      throw new Error(
        "Google Apps Script did not return JSON"
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Sheet rejected submission"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Welcome Kit details received"
    });

  } catch (error) {
    console.error(
      "GLF Welcome Kit submission failed:",
      error.message
    );

    return res.status(502).json({
      success: false,
      error: "Unable to save Welcome Kit details"
    });

  } finally {
    clearTimeout(timer);
  }
};
