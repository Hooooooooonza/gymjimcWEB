// ── State ──
let authToken = null;
let allContent = { events: [], texts: {} };
let deleteTargetId = null;

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

// Allow Enter key on password field
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Tab switching
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
    allContent = data;
    renderEventsList(data.events || []);
    fillTexts(data.texts || {});
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
