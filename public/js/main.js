// ── Load site content ──
async function loadContent() {
  try {
    const res = await fetch('/.netlify/functions/get-content');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const t = data.texts || {};
    if (t['hero-title']) document.getElementById('hero-title').textContent = t['hero-title'];
    if (t['hero-subtitle']) document.getElementById('hero-subtitle').textContent = t['hero-subtitle'];
    if (t['server-address']) document.getElementById('server-address').textContent = t['server-address'];
    if (t['join-intro']) document.getElementById('join-intro').textContent = t['join-intro'];
    if (t['join-step4']) document.getElementById('join-step4').innerHTML = t['join-step4'];
    if (t['join-note']) document.getElementById('join-note').textContent = t['join-note'];
    if (t['vc-intro']) document.getElementById('vc-intro').innerHTML = t['vc-intro'];
    if (t['vc-desc']) document.getElementById('vc-desc').textContent = t['vc-desc'];
    if (t['vc-note']) document.getElementById('vc-note').textContent = t['vc-note'];
    renderEvents(data.events || []);
    renderShopItems(data.shop || {});
  } catch (e) {
    console.warn('Could not load content from backend.', e);
    renderEvents([]);
    renderShopItems({});
  }
}

function renderEvents(events) {
  const container = document.getElementById('events-container');
  if (!events.length) {
    container.innerHTML = `<div class="no-events">
      <p style="font-family:var(--font-pixel);font-size:.6rem;color:var(--green);margin-bottom:1rem;">Žádné eventy</p>
      <p>Momentálně nejsou naplánované žádné eventy. Sleduj tuto stránku!</p>
    </div>`;
    return;
  }
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = new Date();
  const nextIdx = sorted.findIndex(e => new Date(e.date) >= now);
  const html = `<div class="events-grid">` + sorted.map((ev, i) => {
    const isNext = i === nextIdx;
    const d = new Date(ev.date);
    const dateStr = d.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `
    <div class="event-card${isNext ? ' next-event' : ''}">
      <div class="event-date">${dateStr}${ev.time ? ' · ' + ev.time : ''}</div>
      <div class="event-title">${escHtml(ev.title)}</div>
      <div class="event-desc">${escHtml(ev.description || '')}</div>
    </div>`;
  }).join('') + `</div>`;
  container.innerHTML = html;
}

// ── Shop ──
let shopData = {};
let selectedItemId = null;

function renderShopItems(shop) {
  shopData = shop;
  const container = document.getElementById('shop-items-container');
  const items = shop.items || [];
  if (!items.length) {
    container.innerHTML = `<div class="no-events"><p style="color:var(--text-muted)">Momentálně nejsou žádné položky v shopu.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="events-grid">` + items.map(item => `
    <div class="event-card" style="cursor:pointer;" onclick="openBuyModal('${item.id}')">
      <div class="event-title">${escHtml(item.name)}</div>
      ${item.description ? `<div class="event-desc" style="margin:.5rem 0;">${escHtml(item.description)}</div>` : ''}
      <div style="margin-top:1rem;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:var(--font-pixel);font-size:.6rem;color:var(--green)">${escHtml(String(item.price))} Kč</span>
        <span class="btn-primary" style="font-size:.5rem;padding:.5rem 1rem;display:inline-block;">Koupit →</span>
      </div>
    </div>`).join('') + `</div>`;
}

function openBuyModal(itemId) {
  selectedItemId = itemId;
  const item = (shopData.items || []).find(i => i.id === itemId);
  if (!item) return;
  document.getElementById('buy-item-name').textContent = item.name;
  document.getElementById('buy-item-price').textContent = item.price + ' Kč';
  document.getElementById('buy-nick').value = '';
  document.getElementById('buy-agree').checked = false;
  document.getElementById('buy-error').style.display = 'none';
  document.getElementById('buy-modal').style.display = 'flex';
}

function closeBuyModal() {
  document.getElementById('buy-modal').style.display = 'none';
}

async function submitOrder() {
  const nick = document.getElementById('buy-nick').value.trim();
  const agreed = document.getElementById('buy-agree').checked;
  const errEl = document.getElementById('buy-error');
  errEl.style.display = 'none';
  if (!nick) { errEl.textContent = 'Zadej svůj Minecraft nick.'; errEl.style.display = 'block'; return; }
  if (!agreed) { errEl.textContent = 'Musíš souhlasit s podmínkami.'; errEl.style.display = 'block'; return; }

  const btn = document.querySelector('#buy-modal .btn-primary');
  btn.textContent = 'Generuji…';
  btn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, itemId: selectedItemId, agreed: true })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Chyba serveru.'; errEl.style.display = 'block'; return; }
    closeBuyModal();
    showQrModal(data);
  } catch (e) {
    errEl.textContent = 'Chyba připojení.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Generovat QR →';
    btn.disabled = false;
  }
}

function showQrModal(data) {
  const { order, spdString, accountNumber, constantSymbol, specificSymbol } = data;
  document.getElementById('qr-item-name').textContent = order.itemName;
  document.getElementById('qr-item-price').textContent = order.price + ' Kč · Nick: ' + order.nick;
  document.getElementById('qr-account').textContent = accountNumber || '—';
  document.getElementById('qr-vs').textContent = String(order.variableSymbol).padStart(4, '0');
  document.getElementById('qr-ks').textContent = constantSymbol || '—';
  document.getElementById('qr-order-id').textContent = String(order.orderId).padStart(4, '0');
  if (specificSymbol) {
    document.getElementById('qr-ss').textContent = specificSymbol;
    document.getElementById('qr-ss-box').style.display = 'block';
  } else {
    document.getElementById('qr-ss-box').style.display = 'none';
  }
  document.getElementById('qr-modal').style.display = 'flex';
  generateQR(spdString);
}

function closeQrModal() {
  document.getElementById('qr-modal').style.display = 'none';
}

// ── QR Code generator (no library needed, uses Google Charts API) ──
function generateQR(text) {
  const canvas = document.getElementById('qr-canvas');
  const encoded = encodeURIComponent(text);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&bgcolor=171c1a&color=4ade80&format=png`;
}

// ── Copy server address ──
function copyAddress() {
  const addr = document.getElementById('server-address').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });
}

function copyDiscord() {
  const addr = document.getElementById('discord-addres').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });
}

// ── Server status ──
async function checkServerStatus() {
  const badge = document.querySelector('.server-badge');
  try {
    const res = await fetch('https://api.mcstatus.io/v2/status/java/gymjimc.org');
    const data = await res.json();
    if (data.online) {
      const players = data.players?.online ?? 0;
      const max = data.players?.max ?? 0;
      badge.textContent = `● ONLINE – ${players}/${max} hráčů`;
      badge.style.color = 'var(--green)';
    } else {
      badge.textContent = '● OFFLINE';
      badge.style.color = 'var(--red)';
      badge.style.background = 'rgba(248,113,113,0.1)';
      badge.style.borderColor = 'rgba(248,113,113,0.3)';
    }
  } catch (e) {
    badge.textContent = '● Stav neznámý';
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ──
document.addEventListener('DOMContentLoaded', loadContent);
document.addEventListener('DOMContentLoaded', () => {
  checkServerStatus();
  setInterval(checkServerStatus, 10000);
});
