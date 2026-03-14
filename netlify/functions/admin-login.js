// netlify/functions/admin-login.js
// Verifies admin password SERVER-SIDE. Password never sent to client.

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { password } = body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const TOKEN_SECRET = process.env.TOKEN_SECRET;

  if (!ADMIN_PASSWORD || !TOKEN_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server není nakonfigurován. Nastav ADMIN_PASSWORD a TOKEN_SECRET v Netlify env vars.' }),
    };
  }

  // Constant-time comparison to prevent timing attacks
  const pwHash = crypto.createHmac('sha256', TOKEN_SECRET).update(password || '').digest('hex');
  const correctHash = crypto.createHmac('sha256', TOKEN_SECRET).update(ADMIN_PASSWORD).digest('hex');

  if (pwHash !== correctHash) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Nesprávné heslo.' }),
    };
  }

  // Generate a session token (valid for 8 hours)
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${expires}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = `${payload}.${sig}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  };
};
