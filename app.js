/* =====================================================
   WhisperBoard — app.js
   Shared logic for index.html, send.html, board.html
   ===================================================== */

const API_BASE = 'https://whisperboard-uffy.onrender.com';

const MEMBERS = [
  { name: 'Nahid',   emoji: '🌙', color: '#9b7ae0' },
  { name: 'Jubair',  emoji: '⚡', color: '#f0a060' },
  { name: 'Mahbub',  emoji: '🔥', color: '#60a0f0' },
  { name: 'Shihab',  emoji: '🌊', color: '#5ab89b' },
  { name: 'Rakib',   emoji: '🌸', color: '#e07aa0' },
  { name: 'Sharif',   emoji: '🎯', color: '#8ab36a' },
  { name: 'Jahid',  emoji: '💫', color: '#d4a85a' },
  { name: 'Jakir',   emoji: '🎃', color: '#863c3cff' },
  { name: 'Israfil',   emoji: '🎲', color: '#3d7763ff' },
  { name: 'Zia',   emoji: '🌀', color: '#363554ff' },
  { name: 'Shakil',   emoji: '🌳', color: '#d46a6aff' },
];

// ← Edit this slice to control how many members are active (max 8)
const ACTIVE_MEMBERS = MEMBERS.slice(0, 11);

const ANON_NAMES = [
  'Shadow','Whisper','Ghost','Phantom','Specter',
  'Echo','Cipher','Wraith','Veil','Mirage',
  'Dusk','Fog','Haze','Mist','Shade'
];

// ─── Helpers ──────────────────────────────────────────

function getMember(name) {
  return MEMBERS.find(m => m.name === name) || { name, emoji: '👤', color: '#888' };
}

function getAnonLabel(hash) {
  return 'Anonymous ' + ANON_NAMES[Math.abs(hash) % ANON_NAMES.length];
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// ─── Demo fallback data (used when backend is offline) ────

function getDemoMessages() {
  return [
    { id:1, to:'Jubair',  message:'You always interrupt people mid-sentence. Please work on active listening — it will improve your relationships with the whole team.',    hash:1238, created_at: new Date(Date.now()-86400000*2).toISOString() },
    { id:2, to:'Nahid',   message:'Your code reviews are thorough, constructive, and never harsh. You make the whole team better. Thank you for that effort.',             hash:5521, created_at: new Date(Date.now()-86400000).toISOString() },
    { id:3, to:'Mahbub',  message:"You've been consistently late to morning meetings. It shifts the schedule for everyone. Please be more punctual.",                       hash:9872, created_at: new Date(Date.now()-3600000*6).toISOString() },
    { id:4, to:'Jubair',  message:'Your presentations are always well-structured and genuinely inspiring. The way you explain complex ideas is a real skill. Keep going!',  hash:3310, created_at: new Date(Date.now()-3600000*3).toISOString() },
    { id:5, to:'Sadia',   message:'The way you handled the conflict between team members last week was incredibly mature and fair. Real leadership.',                        hash:4456, created_at: new Date(Date.now()-3600000).toISOString() },
    { id:6, to:'Nahid',   message:'Sometimes your feedback can come across as blunt to the point of being discouraging. A slightly warmer tone could go a long way.',       hash:7743, created_at: new Date(Date.now()-1800000).toISOString() },
    { id:7, to:'Tahmid',  message:'You disappear during crunch time and leave others to pick up the slack. The team notices. Please be more present when it counts most.', hash:6612, created_at: new Date(Date.now()-600000).toISOString() },
    { id:8, to:'Rifat',   message:'Your positivity during stressful moments is contagious. You bring the energy up when it dips. The team genuinely appreciates you.',     hash:2987, created_at: new Date(Date.now()-300000).toISOString() },
  ];
}

// ─── HOME: Render member cards ───────────────────────────

function renderMembers(container, withLink) {
  if (!container) return;
  container.innerHTML = '';
  ACTIVE_MEMBERS.forEach(m => {
    const el = document.createElement(withLink ? 'a' : 'div');
    if (withLink) el.href = `send.html?to=${encodeURIComponent(m.name)}`;
    el.className = 'member-card';
    el.style.setProperty('--mc', m.color);
    el.innerHTML = `
      <div class="member-avatar" style="background:${hexToRgba(m.color,0.12)};border-color:${hexToRgba(m.color,0.3)}">
        <span>${m.emoji}</span>
      </div>
      <div class="member-name">${m.name}</div>
      <div class="member-hint">Send message →</div>
    `;
    container.appendChild(el);
  });
}

// ─── SEND: Render recipient buttons ──────────────────────

let selectedTo = null;

function renderRecipients(container) {
  if (!container) return;
  container.innerHTML = '';
  ACTIVE_MEMBERS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'recipient-btn';
    btn.id = `rb-${m.name}`;
    btn.innerHTML = `
      <span class="rb-emoji">${m.emoji}</span>
      <span class="rb-name">${m.name}</span>
      <span class="rb-check" id="chk-${m.name}">✓</span>
    `;
    btn.addEventListener('click', () => selectRecipient(m.name));
    container.appendChild(btn);
  });

  // Pre-select from URL ?to=Name
  const pre = new URLSearchParams(window.location.search).get('to');
  if (pre && ACTIVE_MEMBERS.find(m => m.name === pre)) selectRecipient(pre);
}

function selectRecipient(name) {
  selectedTo = name;
  const m = getMember(name);

  ACTIVE_MEMBERS.forEach(mem => {
    const btn = document.getElementById(`rb-${mem.name}`);
    const chk = document.getElementById(`chk-${mem.name}`);
    if (!btn) return;
    if (mem.name === name) {
      btn.classList.add('selected');
      btn.style.borderColor = mem.color;
      btn.style.background = hexToRgba(mem.color, 0.08);
      if (chk) chk.style.color = mem.color;
      btn.style.setProperty('--sel-color', mem.color);
    } else {
      btn.classList.remove('selected');
      btn.style.borderColor = '';
      btn.style.background = '';
    }
  });

  goToStep(2);

  const pill = document.getElementById('toPill');
  const toEmoji = document.getElementById('toEmoji');
  const toName  = document.getElementById('toName');
  if (pill)    pill.style.setProperty('--pc', m.color);
  if (toEmoji) toEmoji.textContent = m.emoji + ' ';
  if (toName)  toName.textContent  = name;
}

function goToStep(n) {
  [1,2,3].forEach(i => {
    const p = document.getElementById(`step${i}`);
    if (p) p.classList.toggle('hidden', i !== n);
    const dot = document.getElementById(`dot${i}`);
    if (!dot) return;
    dot.classList.remove('active','done');
    if (i < n)  dot.classList.add('done');
    if (i === n) dot.classList.add('active');
    const dn = dot.querySelector('.dot-num');
    if (dn) dn.textContent = i < n ? '✓' : String(i);
  });
  if (n === 2) setTimeout(() => document.getElementById('msgInput')?.focus(), 80);
}

function updateCharCount() {
  const ta = document.getElementById('msgInput');
  const cc = document.getElementById('charCount');
  if (ta && cc) {
    cc.textContent = `${ta.value.length} / 1000`;
    cc.style.color = ta.value.length > 900 ? '#ff6b6b' : '';
  }
}

async function handleSend() {
  const input      = document.getElementById('msgInput');
  const sendBtn    = document.getElementById('sendBtn');
  const sendLabel  = document.getElementById('sendLabel');
  const sendSpinner= document.getElementById('sendSpinner');
  const message    = input?.value.trim() || '';

  if (!selectedTo || !message) return;

  sendBtn.disabled = true;
  sendLabel?.classList.add('hidden');
  sendSpinner?.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selectedTo, message })
    });
    if (!res.ok) throw new Error('server error');
  } catch (e) {
    console.warn('Backend not reachable — demo mode:', e.message);
  }

  const sentToEl = document.getElementById('sentTo');
  if (sentToEl) sentToEl.textContent = selectedTo;
  if (input) input.value = '';
  goToStep(3);

  sendBtn.disabled = false;
  sendLabel?.classList.remove('hidden');
  sendSpinner?.classList.add('hidden');
}

function resetCompose() {
  selectedTo = null;
  const input = document.getElementById('msgInput');
  const cc    = document.getElementById('charCount');
  if (input) input.value = '';
  if (cc) cc.textContent = '0 / 1000';
  ACTIVE_MEMBERS.forEach(m => {
    const btn = document.getElementById(`rb-${m.name}`);
    if (btn) { btn.classList.remove('selected'); btn.style.borderColor=''; btn.style.background=''; }
  });
  goToStep(1);
}

// ─── BOARD ───────────────────────────────────────────────

let allMessages = [];
let currentFilter = 'All';

async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE}/messages`);
    if (!res.ok) throw new Error();
    allMessages = await res.json();
  } catch {
    allMessages = getDemoMessages();
  }
}

function renderMessages(messages) {
  const list  = document.getElementById('messageList');
  const empty = document.getElementById('emptyState');
  const fc    = document.getElementById('filterCount');
  if (!list) return;
  if (fc) fc.textContent = messages.length;

  if (messages.length === 0) {
    list.innerHTML = '';
    list.classList.add('hidden');
    empty?.classList.remove('hidden');
    return;
  }
  list.classList.remove('hidden');
  empty?.classList.add('hidden');

  list.innerHTML = '';
  messages.forEach((msg, i) => {
    const m    = getMember(msg.to);
    const anon = getAnonLabel(msg.hash || 0);
    const card = document.createElement('div');
    card.className = 'message-card';
    card.style.animationDelay = `${i * 0.04}s`;
    card.innerHTML = `
      <div class="msg-left">
        <div class="recipient-tag" style="background:${hexToRgba(m.color,0.1)};border-color:${hexToRgba(m.color,0.35)};color:${m.color}">
          <span class="tag-emoji">${m.emoji}</span>
          <span class="tag-name">To: ${escapeHtml(msg.to)}</span>
        </div>
        <div class="sender-row">
          <span class="sender-ghost">👻</span>
          <span class="sender-label">${anon}</span>
        </div>
        <div class="msg-time">${timeAgo(msg.created_at)}</div>
      </div>
      <div class="msg-right">
        <p class="msg-text">${escapeHtml(msg.message)}</p>
      </div>
    `;
    list.appendChild(card);
  });
}

function filterMessages(name) {
  currentFilter = name;
  document.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === name);
  });
  renderMessages(name === 'All' ? allMessages : allMessages.filter(m => m.to === name));
}

async function initBoard() {
  const pillsEl = document.getElementById('filterPills');
  if (pillsEl) {
    const allPill = document.createElement('button');
    allPill.className = 'filter-pill active';
    allPill.dataset.filter = 'All';
    allPill.textContent = 'All';
    allPill.addEventListener('click', () => filterMessages('All'));
    pillsEl.appendChild(allPill);

    ACTIVE_MEMBERS.forEach(m => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill';
      pill.dataset.filter = m.name;
      pill.innerHTML = `<span>${m.emoji}</span> ${m.name}`;
      pill.addEventListener('click', () => filterMessages(m.name));
      pillsEl.appendChild(pill);
    });
  }

  const loadingEl = document.getElementById('loadingState');
  await loadMessages();
  if (loadingEl) loadingEl.classList.add('hidden');

  const tc = document.getElementById('totalCount');
  if (tc) tc.textContent = allMessages.length;
  renderMessages(allMessages);
}
