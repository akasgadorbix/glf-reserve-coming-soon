
const crypto = require('node:crypto');

function validateToken(token) {
  const secret = process.env.GLF_TOKEN_SECRET;

  if (
    !secret ||
    secret.length < 32 ||
    typeof token !== 'string' ||
    token.length > 3000
  ) {
    return null;
  }

  const parts = token.split('.');

  if (
    parts.length !== 2 ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[1])
  ) {
    return null;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(parts[0])
    .digest();

  const provided = Buffer.from(
    parts[1],
    'base64url'
  );

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(
        parts[0],
        'base64url'
      ).toString('utf8')
    );

    if (
      !data ||
      typeof data.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
      !Number.isSafeInteger(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      email: data.email.trim().toLowerCase()
    };

  } catch (_) {
    return null;
  }
}

module.exports = {
  validateToken
};
  
