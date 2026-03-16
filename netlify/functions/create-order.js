// netlify/functions/create-order.js
// Public endpoint - creates a new order and returns payment details

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { nick, itemId, agreed } = body;
  if (!nick || !itemId || !agreed) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí povinné pole.' }) };
  }

  // Load current content
  const getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': API_KEY },
  });
  const getData = await getRes.json();
  const content = getData.record || {};

  const shop = content.shop || {};
  const items = shop.items || [];
  const item = items.find(i => i.id === itemId);
  if (!item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Položka nenalezena.' }) };
  }

  const nextOrderId = shop.nextOrderId || 1;
  const variableSymbol = nextOrderId;

  const order = {
    orderId: nextOrderId,
    nick,
    itemId,
    itemName: item.name,
    price: item.price,
    variableSymbol,
    paid: false,
    createdAt: new Date().toISOString(),
  };

  const orders = [...(content.orders || []), order];
  const updatedShop = { ...shop, nextOrderId: nextOrderId + 1 };
  const updatedContent = { ...content, shop: updatedShop, orders };

  // Save back
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
    body: JSON.stringify(updatedContent),
  });

  // Build SPD QR string for Czech bank transfer
  const iban = czAccountToIBAN(shop.accountNumber || '');
  let spdParts = [`SPD*1.0`, `ACC:${iban}`, `AM:${item.price.toFixed(2)}`, `CC:CZK`, `VS:${variableSymbol}`];
  if (shop.constantSymbol) spdParts.push(`KS:${shop.constantSymbol}`);
  if (shop.specificSymbol) spdParts.push(`SS:${shop.specificSymbol}`);
  spdParts.push(`MSG:${nick} - ${item.name}`);
  const spdString = spdParts.join('*');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      order,
      spdString,
      accountNumber: shop.accountNumber,
      constantSymbol: shop.constantSymbol,
      specificSymbol: shop.specificSymbol,
    }),
  };
};

function czAccountToIBAN(accountNumber) {
  // Format: prefix-number/bankCode or number/bankCode
  const match = accountNumber.match(/^(?:(\d+)-)?(\d+)\/(\d{4})$/);
  if (!match) return accountNumber;
  const prefix = (match[1] || '').padStart(6, '0');
  const number = match[2].padStart(10, '0');
  const bankCode = match[3];
  const bban = bankCode + prefix + number;
  const check = 98 - mod97('CZ00' + bban);
  return `CZ${String(check).padStart(2,'0')}${bban}`;
}

function mod97(str) {
  let remainder = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    const digit = c >= 65 ? c - 55 : c - 48;
    remainder = (remainder * (digit < 10 ? 10 : 100) + digit) % 97;
  }
  return remainder;
}
