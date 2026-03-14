// ── Load site content (events + editable texts) from backend ──

async function loadContent() {
  try {
    const res = await fetch('/.netlify/functions/get-content');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();

    // Apply editable texts
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

    // Render events
    renderEvents(data.events || []);
  } catch (e) {
    console.warn('Could not load content from backend, using defaults.', e);
    renderEvents([]);
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

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

document.addEventListener('DOMContentLoaded', () => {
  checkServerStatus();
  setInterval(checkServerStatus, 10000);
});

// ── Init ──
document.addEventListener('DOMContentLoaded', loadContent);
