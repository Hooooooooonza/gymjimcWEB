// ── State ──
let authToken = null;
let allContent = { events: [], texts: {}, shop: { items: [], accountNumber: '', constantSymbol: '', specificSymbol: '', nextOrderId: 1 }, orders: [] };
let deleteTargetId = null;
let deleteItemTargetId = null;

// ── Login ──
async function doLogin() {
  const pw = document.getElementById('password-input').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!pw) { showLoginError('Zadej heslo.'); return; }
  try {
    const res = await fetch('/.netlify/functions/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (!res.ok) { showLoginError(data.error || 'Nesprávné heslo.'); return; }
    authToken = data.token;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    loadAdminContent();
  } catch (e) {
    showLoginError('Chyba připojení k serveru.');
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
      document.getElementById('tab-' + tab).style.display = 'block';
    });
  });
});

function doLogout() {
  authToken = null;
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('password-input').value = '';
}

// ── Load content ──
async function loadAdminContent() {
  try {
    const res = await fetch('/.netlify/functions/get-content');
    const data = await res.json();
    allContent = {
      events: data.events || [],
      texts: data.texts || {},
      shop: data.shop || { items: [], accountNumber: '', constantSymbol: '', specificSymbol: '', nextOrderId: 1 },
      orders: data.orders || []
    };
    renderEventsList(allContent.events);
    fillTexts(allContent.texts);
    fillShopSettings(allContent.shop);
    renderItemsList(allContent.shop.items || []);
    renderOrdersList(allContent.orders);
  } catch (e) {
    document.getElementById('events-list').innerHTML = '<p style="color:var(--red)">Chyba načítání.</p>';
  }
}

// ── Events ──
function renderEventsList(events) {
  const el = document.getElementById('events-list');
  if (!events.length) {
    el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Zatím žádné eventy. Přidej první!</p>';
    return;
  }
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  el.innerHTML = sorted.map(ev => {
    const d = new Date(ev.date);
    const dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
    <div class="admin-event-row">
      <div class="admin-event-info">
        <div class="admin-event-title">${esc(ev.title)}</div>
        <div class="admin-event-date">${dateStr}${ev.time ? ' · ' + esc(ev.time) : ''}</div>
        ${ev.description ? `<div class="admin-event-desc">${esc(ev.description)}</div>` : ''}
      </div>
      <div class="row-btns">
        <button class="btn-edit" onclick="openEditEvent('${ev.id}')">Upravit</button>
        <button class="btn-danger" onclick="openDeleteModal('${ev.id}')">Smazat</button>
      </div>
    </div>`;
  }).join('');
}

function openAddEvent() {
  document.getElementById('modal-title').textContent = 'Přidat event';
  document.getElementById('event-id').value = '';
  document.getElementById('event-title').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-time').value = '';
  document.getElementById('event-desc').value = '';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('event-modal').style.display = 'flex';
}

function openEditEvent(id) {
  const ev = allContent.events.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('modal-title').textContent = 'Upravit event';
  document.getElementById('event-id').value = ev.id;
  document.getElementById('event-title').value = ev.title;
  document.getElementById('event-date').value = ev.date;
  document.getElementById('event-time').value = ev.time || '';
  document.getElementById('event-desc').value = ev.description || '';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('event-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('event-modal').style.display = 'none';
}

async function saveEvent() {
  const id = document.getElementById('event-id').value;
  const title = document.getElementById('event-title').value.trim();
  const date = document.getElementById('event-date').value;
  const time = document.getElementById('event-time').value.trim();
  const description = document.getElementById('event-desc').value.trim();
  const errEl = document.getElementById('modal-error');
  if (!title || !date) {
    errEl.textContent = 'Název a datum jsou povinné.';
    errEl.style.display = 'block';
    return;
  }
  const event = { id: id || crypto.randomUUID(), title, date, time, description };
  let events = [...(allContent.events || [])];
  if (id) {
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) events[idx] = event;
  } else {
    events.push(event);
  }
  await saveContent({ ...allContent, events });
  closeModal();
}

function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('delete-modal').style.display = 'flex';
}
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal').style.display = 'none';
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  const events = (allContent.events || []).filter(e => e.id !== deleteTargetId);
  await saveContent({ ...allContent, events });
  closeDeleteModal();
}

// ── Texts ──
function fillTexts(texts) {
  const fields = ['hero-title','hero-subtitle','server-address','join-intro','join-step4','join-note','vc-intro','vc-desc','vc-note'];
  fields.forEach(key => {
    const el = document.getElementById('txt-' + key);
    if (el && texts[key] !== undefined) el.value = texts[key];
  });
}

async function saveTexts() {
  const fields = ['hero-title','hero-subtitle','server-address','join-intro','join-step4','join-note','vc-intro','vc-desc','vc-note'];
  const texts = {};
  fields.forEach(key => {
    const el = document.getElementById('txt-' + key);
    if (el) texts[key] = el.value;
  });
  await saveContent({ ...allContent, texts });
  const status = document.getElementById('save-status');
  status.textContent = '✓ Texty uloženy!';
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 3000);
}

// ── Shop settings ──
function fillShopSettings(shop) {
  const accEl = document.getElementById('shop-account');
  const csEl = document.getElementById('shop-constant-symbol');
  const specEl = document.getElementById('shop-specific-symbol');
  if (accEl) accEl.value = shop.accountNumber || '';
  if (csEl) csEl.value = shop.constantSymbol || '';
  if (specEl) specEl.value = shop.specificSymbol || '';
}

async function saveShopSettings() {
  const accountNumber = document.getElementById('shop-account').value.trim();
  const constantSymbol = document.getElementById('shop-constant-symbol').value.trim();
  const specificSymbol = document.getElementById('shop-specific-symbol').value.trim();
  const shop = { ...allContent.shop, accountNumber, constantSymbol, specificSymbol };
  await saveContent({ ...allContent, shop });
  const status = document.getElementById('shop-save-status');
  status.textContent = '✓ Nastavení uloženo!';
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 3000);
}

// ── Shop items ──
function renderItemsList(items) {
  const el = document.getElementById('items-list');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Zatím žádné položky. Přidej první!</p>';
    return;
  }
  el.innerHTML = items.map(item => `
    <div class="admin-event-row">
      <div class="admin-event-info">
        <div class="admin-event-title">${esc(item.name)}</div>
        <div class="admin-event-date" style="color:var(--green)">${esc(String(item.price))} Kč</div>
        ${item.description ? `<div class="admin-event-desc">${esc(item.description)}</div>` : ''}
      </div>
      <div class="row-btns">
        <button class="btn-edit" onclick="openEditItem('${item.id}')">Upravit</button>
        <button class="btn-danger" onclick="openDeleteItemModal('${item.id}')">Smazat</button>
      </div>
    </div>`).join('');
}

function openAddItem() {
  document.getElementById('item-modal-title').textContent = 'Přidat položku';
  document.getElementById('item-id').value = '';
  document.getElementById('item-name').value = '';
  document.getElementById('item-price').value = '';
  document.getElementById('item-desc').value = '';
  document.getElementById('item-modal-error').style.display = 'none';
  document.getElementById('item-modal').style.display = 'flex';
}

function openEditItem(id) {
  const item = (allContent.shop.items || []).find(i => i.id === id);
  if (!item) return;
  document.getElementById('item-modal-title').textContent = 'Upravit položku';
  document.getElementById('item-id').value = item.id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-price').value = item.price;
  document.getElementById('item-desc').value = item.description || '';
  document.getElementById('item-modal-error').style.display = 'none';
  document.getElementById('item-modal').style.display = 'flex';
}

function closeItemModal() {
  document.getElementById('item-modal').style.display = 'none';
}

async function saveItem() {
  const id = document.getElementById('item-id').value;
  const name = document.getElementById('item-name').value.trim();
  const price = parseFloat(document.getElementById('item-price').value);
  const description = document.getElementById('item-desc').value.trim();
  const errEl = document.getElementById('item-modal-error');
  if (!name || isNaN(price) || price <= 0) {
    errEl.textContent = 'Název a cena jsou povinné.';
    errEl.style.display = 'block';
    return;
  }
  const item = { id: id || crypto.randomUUID(), name, price, description };
  let items = [...(allContent.shop.items || [])];
  if (id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) items[idx] = item;
  } else {
    items.push(item);
  }
  const shop = { ...allContent.shop, items };
  await saveContent({ ...allContent, shop });
  renderItemsList(items);
  closeItemModal();
}

function openDeleteItemModal(id) {
  deleteItemTargetId = id;
  document.getElementById('delete-item-modal').style.display = 'flex';
}
function closeDeleteItemModal() {
  deleteItemTargetId = null;
  document.getElementById('delete-item-modal').style.display = 'none';
}
async function confirmDeleteItem() {
  if (!deleteItemTargetId) return;
  const items = (allContent.shop.items || []).filter(i => i.id !== deleteItemTargetId);
  const shop = { ...allContent.shop, items };
  await saveContent({ ...allContent, shop });
  renderItemsList(items);
  closeDeleteItemModal();
}

// ── Orders ──
function renderOrdersList(orders) {
  const el = document.getElementById('orders-list');
  if (!orders || !orders.length) {
    el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Zatím žádné objednávky.</p>';
    return;
  }
  const sorted = [...orders].sort((a, b) => b.orderId - a.orderId);
  el.innerHTML = sorted.map(o => {
    const date = new Date(o.createdAt).toLocaleString('cs-CZ');
    return `
    <div class="admin-event-row">
      <div class="admin-event-info">
        <div class="admin-event-title">#${String(o.orderId).padStart(4,'0')} – ${esc(o.nick)}</div>
        <div class="admin-event-date">${esc(o.itemName)} · ${esc(String(o.price))} Kč</div>
        <div class="admin-event-desc">VS: ${esc(String(o.variableSymbol))} · ${date}</div>
      </div>
      <div class="row-btns">
        <span class="order-status ${o.paid ? 'paid' : 'pending'}">${o.paid ? '✓ Zaplaceno' : '⏳ Čeká'}</span>
        ${!o.paid ? `<button class="btn-edit" onclick="markPaid(${o.orderId})">Označit zaplaceno</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function markPaid(orderId) {
  const orders = (allContent.orders || []).map(o =>
    o.orderId === orderId ? { ...o, paid: true } : o
  );
  await saveContent({ ...allContent, orders });
  renderOrdersList(orders);
}

// ── Save to backend ──
async function saveContent(content) {
  allContent = content;
  const res = await fetch('/.netlify/functions/save-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authToken
    },
    body: JSON.stringify(content)
  });
  if (!res.ok) {
    const d = await res.json();
    alert('Chyba ukládání: ' + (d.error || res.status));
    return;
  }
  renderEventsList(content.events || []);
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
