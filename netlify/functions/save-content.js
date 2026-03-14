// netlify/functions/save-content.js
// Protected endpoint - verifies admin token, then saves content to JSONBin

const crypto = require('crypto');

function verifyToken(token, secret) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (sig !== expectedSig) return false;
  const expires = parseInt(payload, 10);
  if (Date.now() > expires) return false;
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const TOKEN_SECRET = process.env.TOKEN_SECRET;
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  // Verify auth
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');

  if (!verifyToken(token, TOKEN_SECRET)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Neautorizováno.' }),
    };
  }

  let content;
  try {
    content = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Save to JSONBin
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
      },
      body: JSON.stringify(content),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'JSONBin error: ' + text }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
