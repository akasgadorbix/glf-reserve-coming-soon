module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    console.error(
      'Missing GOOGLE_SHEETS_WEBHOOK_URL or GOOGLE_SHEETS_WEBHOOK_SECRET'
    );

    return res.status(500).json({
      error: 'Signup service is not configured yet.'
    });
  }

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : {};

  const email = String(body.email || '')
    .trim()
    .toLowerCase();

  const honeypot = String(body.company || '').trim();

  // Spam bot honeypot
  if (honeypot) {
    return res.status(200).json({
      ok: true,
      alreadyJoined: false
    });
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(email) ||
    email.length > 254
  ) {
    return res.status(400).json({
      error: 'Please enter a valid email address.'
    });
  }

  // Country from Vercel
  const headerCountry = String(
    req.headers['x-vercel-ip-country'] || ''
  ).toUpperCase();

  // Browser fallback
  const browserCountry = String(
    body.countryCode || ''
  ).toUpperCase();

  const countryCode =
    /^[A-Z]{2}$/.test(headerCountry)
      ? headerCountry
      : /^[A-Z]{2}$/.test(browserCountry)
        ? browserCountry
        : '';

  let country = 'Unknown';

  if (countryCode) {
    try {
      country =
        new Intl.DisplayNames(
          ['en'],
          { type: 'region' }
        ).of(countryCode) || countryCode;
    } catch (error) {
      country = countryCode;
    }
  }

  const payload = {
    secret: webhookSecret,
    email,
    country,
    countryCode,
    locale: String(body.locale || '').slice(0, 40),
    timezone: String(body.timezone || '').slice(0, 80),
    submittedAt: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await response.text();

    let data = {};

    try {
      data = JSON.parse(text);
    } catch (error) {}

    if (!response.ok || data.ok === false) {
      console.error(
        'Google Sheets webhook error:',
        response.status,
        text.slice(0, 500)
      );

      return res.status(502).json({
        error:
          'Unable to join right now. Please try again.'
      });
    }

    return res.status(200).json({
      ok: true,
      alreadyJoined: Boolean(
        data.alreadyJoined
      )
    });

  } catch (error) {
    console.error('Join API failed:', error);

    return res.status(500).json({
      error:
        'Unable to join right now. Please try again.'
    });
  }
};
