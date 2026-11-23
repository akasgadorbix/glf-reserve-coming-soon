
"use strict";

/*
 GLF RESERVE — COMMON LINK WELCOME KIT API

 Public form:
 https://glfreserve.com/welcome-kit/

 Saves to Akash's Google Sheet2 through
 GLF Reserve - Welcome Kit LIVE Apps Script.

 No personal token required.
*/

const VALID_FRAGRANCES = new Set([
  "Santal Reserve",
  "Citrus Hinoki",
  "Amber Coast",
  "FREE"
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

module.exports = async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  // Only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  // Validate request body
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid request"
    });
  }

  // Basic honeypot spam protection
  if (req.body.company) {
    return res.status(400).json({
      success: false,
      error: "Invalid request"
    });
  }

  // Collect form data
  const data = {
    name: clean(req.body.fullName, 120),

    email: clean(req.body.email, 254)
      .toLowerCase(),

    fragrance: clean(req.body.fragrance, 60),

    address: clean(req.body.address, 500),

    city: clean(req.body.city, 100),

    state: clean(req.body.state, 100),

    postal: clean(req.body.postal, 40),

    country: clean(req.body.country, 100)
  };

  // Validate fields
  if (
    !data.name ||
    !EMAIL_RE.test(data.email) ||
    !VALID_FRAGRANCES.has(data.fragrance) ||
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

  // Private environment variables from Vercel
  const scriptUrl =
    process.env.GLF_SHEET_WEBAPP_URL;

  const secret =
    process.env.GLF_API_SECRET;

  if (!scriptUrl || !secret) {
    return res.status(503).json({
      success: false,
      error: "Sheet connection not configured"
    });
  }

  // Check Google Apps Script Web App URL
  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/
      .test(scriptUrl)
  ) {
    return res.status(503).json({
      success: false,
      error: "Invalid Sheet service URL"
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {

    // Send data to Welcome Kit LIVE Apps Script
    const response = await fetch(scriptUrl, {
      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify({
        ...data,
        secret: secret
      }),

      redirect: "follow",
      signal: controller.signal
    });

    const raw = await response.text();

    let result;

    try {
      result = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        "Apps Script did not return JSON"
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
        "Sheet rejected the submission"
      );
    }

    return res.status(200).json({
      success: true
    });

  } catch (error) {

    console.error(
      "[GLF Welcome Kit]",
      error.message
    );

    return res.status(502).json({
      success: false,
      error:
        "Unable to save your details. Please try again."
    });

  } finally {
    clearTimeout(timeout);
  }
};
