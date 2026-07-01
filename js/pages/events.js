/* events.html 固有スクリプト */
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
const CAT_COLORS = ['','cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8'];
const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#a5d6a7,#81c784)',
  'linear-gradient(135deg,#90caf9,#64b5f6)',
  'linear-gradient(135deg,#ce93d8,#ab47bc)',
  'linear-gradient(135deg,#ffe082,#ffca28)',
  'linear-gradient(135deg,#f48fb1,#e91e63)',
  'linear-gradient(135deg,#80deea,#00acc1)',
  'linear-gradient(135deg,#ffab91,#ff5722)',
  'linear-gradient(135deg,#bcaaa4,#8d6e63)',
];

let client, allEvents = [], allCategories = [], allOrgs = [];
let activeCat = 'all', activeTab = 'all', currentRequestType = '参加したい';

window.addEventListener('DOMContentLoaded', async () => {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const [catsRes, eventsRes, orgsRes] = await Promise.all([
    client.from('event_categories').select('*').order('id'),
    client.from('events').select('*, event_categories(name, emoji)').eq('status', 'active').order('id'),
    client.from('organizations').select('*')
  ]);
  allCategories = catsRes.data || [];
  allEvents = eventsRes.data || [];
  allOrgs = orgsRes.data || [];

  document.getElementById('heroCount').textContent = allEvents.length;

  const chips = document.getElementById('catChips');
  allCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.dataset.cat = cat.id;
    btn.textContent = (cat.emoji || '') + ' ' + cat.name;
    btn.onclick = () => filterCat(btn, cat.id);
    chips.appendChild(btn);
  });

  if (new URLSearchParams(location.search).get('tab') === 'staff') switchTab('help');
  else applyFilters();
});

function filterCat(el, cat) {
  activeCat = cat;
  document.querySelectorAll('#catChips .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function filterType(el, type) {
  document.querySelectorAll('[data-type]').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  if (type === 'all') switchTab('all');
  else if (type === 'join') switchTab('join');
  else switchTab('help');
}

function switchTab(tab) {
  activeTab = tab;
  ['tabAll','tabJoin','tabHelp'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(tab === 'all' ? 'tabAll' : tab === 'join' ? 'tabJoin' : 'tabHelp').classList.add('active');
  applyFilters();
}

function resetFilters() {
  activeCat = 'all';
  activeTab = 'all';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('#catChips .filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('#catChips .filter-chip[data-cat="all"]').classList.add('active');
  document.getElementById('tabAll').classList.add('active');
  document.getElementById('tabJoin').classList.remove('active');
  document.getElementById('tabHelp').classList.remove('active');
  applyFilters();
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  let filtered = allEvents.filter(ev => {
    if (activeCat !== 'all' && ev.category_id != activeCat) return false;
    if (activeTab === 'join' && !ev.can_participate) return false;
    if (activeTab === 'help' && !ev.can_help) return false;
    if (q && !ev.title.toLowerCase().includes(q) && !(ev.organizer_name||'').toLowerCase().includes(q)) return false;
    return true;
  });
  renderCards(filtered);
}

function renderCards(events) {
  const grid = document.getElementById('eventsGrid');
  document.getElementById('resultInfo').textContent = `${events.length}件のあそびを表示中`;
  if (!events.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🌿</div>
      <div class="empty-title">あそびが見つかりませんでした</div>
      <div class="empty-desc">絞り込み条件を変えて探してみてください</div>
    </div>`;
    return;
  }
  grid.innerHTML = events.map(ev => {
    const cat = ev.event_categories;
    const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
    const grad = THUMB_GRADIENTS[(ev.category_id - 1) % THUMB_GRADIENTS.length] || THUMB_GRADIENTS[0];
    const emoji = cat ? cat.emoji : '🎪';
    return `<div class="event-card" onclick="openModal(${ev.id})">
      <div class="card-thumb" style="background:${grad}">
        <span style="font-size:52px">${emoji}</span>
        <div class="card-cat-badge ${catClass}">${cat ? cat.name : ''}</div>
        ${ev.can_help ? '<div class="card-type-badge">🙌 スタッフ募集</div>' : (ev.can_participate ? '<div class="card-type-badge">✋ 参加者募集</div>' : '')}
      </div>
      <div class="card-body">
        <div class="card-title">${ev.title}</div>
        <div class="card-meta">
          ${ev.event_date ? `<div class="card-meta-item">🗓️ ${ev.event_date}</div>` : ''}
          ${ev.location ? `<div class="card-meta-item">📍 ${ev.location}</div>` : ''}
          <div class="card-meta-item">👤 ${ev.organizer_name || ''}</div>
        </div>
      </div>
      <div class="card-footer">
        ${ev.target_audience ? `<span class="card-tag">${ev.target_audience}</span>` : ''}
        ${ev.fee ? `<span class="card-tag">💴 ${ev.fee}</span>` : '<span class="card-tag">💴 無料</span>'}
        ${ev.can_participate ? '<span class="card-tag can-join">✋ 参加OK</span>' : ''}
        ${ev.can_help ? '<span class="card-tag can-help">🙌 手伝いOK</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function openModal(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;
  const cat = ev.event_categories;
  const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
  const org = allOrgs.find(o => o.org_name === ev.organizer_name);

  document.getElementById('modalHeader').innerHTML = `
    <div class="modal-category-badge ${catClass}">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    <div class="modal-title">${ev.title}</div>
    <div class="modal-organizer">📍 ${ev.organizer_name || ''}　${ev.organizer_type ? '｜ ' + ev.organizer_type : ''}</div>`;

  document.getElementById('modalBody').innerHTML = `
    <p class="modal-desc">${ev.description || ''}</p>
    <div class="info-grid">
      ${ev.event_date ? `<div class="info-item"><div class="info-label">🗓️ 開催時期</div><div class="info-value">${ev.event_date}</div></div>` : ''}
      ${ev.location ? `<div class="info-item"><div class="info-label">📍 場所</div><div class="info-value">${ev.location}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--green);font-weight:700;">🗺️ Googleマップで見る</a></div></div>` : ''}
      ${ev.target_audience ? `<div class="info-item"><div class="info-label">👥 対象</div><div class="info-value">${ev.target_audience}</div></div>` : ''}
      <div class="info-item"><div class="info-label">💴 参加費</div><div class="info-value">${ev.fee || '無料'}</div></div>
      ${ev.max_participants ? `<div class="info-item"><div class="info-label">🙋 定員</div><div class="info-value">${ev.max_participants}名</div></div>` : ''}
    </div>
    ${ev.event_url ? `<a href="${ev.event_url}" target="_blank" rel="noopener" style="display:block;background:var(--green);color:white;text-align:center;padding:13px;border-radius:14px;font-size:14px;font-weight:800;text-decoration:none;margin-bottom:16px;">🔗 イベント詳細ページを見る</a>` : ''}
    ${ev.knowhow_summary ? `<div style="background:#F0FBF5;border-radius:14px;padding:16px;margin-bottom:16px"><div style="font-size:13px;font-weight:800;color:var(--green);margin-bottom:8px">💡 ノウハウ・ポイント</div><div style="font-size:14px;color:#444;line-height:1.9">${ev.knowhow_summary}</div></div>` : ''}
    ${ev.tools_needed ? `<div style="background:#FFF8E1;border-radius:14px;padding:16px;margin-bottom:16px"><div style="font-size:13px;font-weight:800;color:#F57F17;margin-bottom:8px">🛠️ 必要な道具・準備物</div><div style="font-size:14px;color:#444;line-height:1.9">${ev.tools_needed}</div></div>` : ''}
    ${org && org.contact_email ? `<div class="contact-box"><div class="contact-title">📧 このあそびについて問い合わせる</div><a href="mailto:${org.contact_email}" class="contact-email">${org.contact_email}</a></div>` : ''}
    ${(ev.can_participate || ev.can_help) ? `
    <div class="form-section">
      <div class="form-title">このイベントに関わる</div>
      <div class="form-sub">仕掛け人になろう！自ら動いてコンタクトする</div>
      ${ev.can_participate && ev.can_help ? `
      <div class="form-tabs">
        <button class="form-tab active" onclick="setTab(this,'参加したい')">✋ 参加したい</button>
        <button class="form-tab" onclick="setTab(this,'お手伝いしたい')">🙌 お手伝いしたい</button>
      </div>` : ''}
      <form id="reqForm-${ev.id}" onsubmit="submitRequest(event,${ev.id})">
        <div class="form-group"><label>お名前</label><input type="text" name="name" placeholder="山田 太郎" required></div>
        <div class="form-group"><label>メールアドレス</label><input type="email" name="email" placeholder="example@mail.com" required></div>
        <div class="form-group"><label>所属（学校・団体名）</label><input type="text" name="school_name" placeholder="○○小おやじの会"></div>
        <div class="form-group"><label>メッセージ・質問</label><textarea name="message" placeholder="気になることや質問があれば"></textarea></div>
        <button type="submit" class="submit-btn" id="sbtn-${ev.id}">送信する →</button>
        <div class="success-msg" id="smsg-${ev.id}">🎉 送信しました！後ほどご連絡します。</div>
      </form>
    </div>` : ''}`;

  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('modalCloseBtn').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function setTab(btn, type) {
  currentRequestType = type;
  document.querySelectorAll('.form-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function submitRequest(e, eventId) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById(`sbtn-${eventId}`);
  btn.disabled = true; btn.textContent = '送信中...';
  const { error } = await client.from('participation_requests').insert({
    event_id: eventId, name: form.name.value, email: form.email.value,
    school_name: form.school_name.value, request_type: currentRequestType, message: form.message.value
  });
  if (!error) { form.style.display = 'none'; document.getElementById(`smsg-${eventId}`).style.display = 'block'; }
  else { btn.disabled = false; btn.textContent = '送信する →'; alert('送信に失敗しました。'); }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modalCloseBtn').classList.remove('show');
  document.body.style.overflow = '';
}
function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
