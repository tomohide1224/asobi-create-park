/* events.html — あそびを探す（🎪開催予定 ⇄ 📚やってみた記録 統合版）
   Phase C Step3: 1ページで状態タブ切替。
   ・開催予定  = status=active & is_public & 開催日(event_on)が未設定 or まだ過ぎていない
   ・やってみた記録 = status=published（事例）
   開催日が過ぎた開催予定は自動的に一覧から外れる。 */
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

let client, allEvents = [], allRecords = [], allCategories = [], allOrgs = [];
let currentTab = 'upcoming';
let activeCat = 'all', knowhowOnly = false, currentRequestType = 'participate';

window.addEventListener('DOMContentLoaded', async () => {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const [catsRes, evRes, orgsRes] = await Promise.all([
    client.from('event_categories').select('*').order('id'),
    client.from('events').select('*, event_categories(name, emoji)').in('status', ['active', 'published']).order('id'),
    client.from('organizations').select('*')
  ]);
  allCategories = catsRes.data || [];
  allOrgs = orgsRes.data || [];
  const rows = evRes.data || [];
  const today = new Date().toISOString().slice(0, 10);
  allEvents = rows.filter(ev => ev.status === 'active' && ev.is_public === true && (!ev.event_on || ev.event_on >= today));
  allRecords = rows.filter(ev => ev.status === 'published');

  const chips = document.getElementById('catChips');
  allCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.dataset.cat = cat.id;
    btn.textContent = (cat.emoji || '') + ' ' + cat.name;
    btn.onclick = () => filterCat(btn, cat.id);
    chips.appendChild(btn);
  });

  const p = new URLSearchParams(location.search).get('tab');
  switchTab((p === 'cases' || p === 'records') ? 'records' : 'upcoming');
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.asobi-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const up = document.getElementById('upcomingWrap');
  const rec = document.getElementById('recordsWrap');
  if (up) up.style.display = tab === 'upcoming' ? '' : 'none';
  if (rec) rec.style.display = tab === 'records' ? '' : 'none';
  const kw = document.getElementById('knowhowFilter');
  if (kw) kw.style.display = tab === 'records' ? '' : 'none';
  document.getElementById('heroCount').textContent = tab === 'upcoming' ? allEvents.length : allRecords.length;
  const label = document.getElementById('heroCountLabel');
  if (label) label.textContent = tab === 'upcoming' ? '件のあそびを掲載中' : '件の事例を掲載中';
  applyFilters();
}

function filterCat(el, cat) {
  activeCat = cat;
  document.querySelectorAll('#catChips .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function toggleKnowhow(btn) {
  knowhowOnly = !knowhowOnly;
  btn.classList.toggle('active', knowhowOnly);
  applyFilters();
}

function resetFilters() {
  activeCat = 'all'; knowhowOnly = false;
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('#catChips .filter-chip').forEach(c => c.classList.remove('active'));
  const allChip = document.querySelector('#catChips .filter-chip[data-cat="all"]');
  if (allChip) allChip.classList.add('active');
  const kc = document.getElementById('chipKnowhow'); if (kc) kc.classList.remove('active');
  applyFilters();
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  if (currentTab === 'upcoming') {
    const filtered = allEvents.filter(ev => {
      if (activeCat !== 'all' && ev.category_id != activeCat) return false;
      if (q && !ev.title.toLowerCase().includes(q) && !(ev.organizer_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
    renderUpcoming(filtered);
  } else {
    const filtered = allRecords.filter(ev => {
      if (activeCat !== 'all' && ev.category_id != activeCat) return false;
      if (knowhowOnly && !ev.knowhow_summary) return false;
      if (q && !ev.title.toLowerCase().includes(q) && !(ev.organizer_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
    renderRecords(filtered);
  }
}

/* ---------- 開催予定（参加・手伝い・問い合わせ） ---------- */
function renderUpcoming(events) {
  const grid = document.getElementById('eventsGrid');
  document.getElementById('resultInfo').textContent = `${events.length}件のあそびを表示中`;
  if (!events.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🌿</div>
      <div class="empty-title">開催予定のあそびはありません</div>
      <div class="empty-desc">「📚 やってみた記録」から過去のあそびを見てみてください</div>
    </div>`;
    return;
  }
  grid.innerHTML = events.map(ev => {
    const cat = ev.event_categories;
    const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
    const grad = THUMB_GRADIENTS[(ev.category_id - 1) % THUMB_GRADIENTS.length] || THUMB_GRADIENTS[0];
    const emoji = cat ? cat.emoji : '🎪';
    const dateStr = ev.event_date || ev.event_on || '';
    return `<div class="event-card" onclick="openModal(${ev.id})">
      <div class="card-thumb" style="background:${grad}">
        <span style="font-size:52px">${emoji}</span>
        <div class="card-cat-badge ${catClass}">${cat ? cat.name : ''}</div>
        ${ev.can_help ? '<div class="card-type-badge">🙌 スタッフも募集</div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${ev.title}</div>
        <div class="card-meta">
          ${dateStr ? `<div class="card-meta-item">🗓️ ${dateStr}</div>` : ''}
          ${ev.location ? `<div class="card-meta-item">📍 ${ev.location}</div>` : ''}
          <div class="card-meta-item">👤 ${ev.organizer_name || ''}</div>
        </div>
      </div>
      <div class="card-footer">
        ${ev.target_audience ? `<span class="card-tag">${ev.target_audience}</span>` : ''}
        ${ev.fee ? `<span class="card-tag">💴 ${ev.fee}</span>` : '<span class="card-tag">💴 無料</span>'}
      </div>
    </div>`;
  }).join('');
}

/* ---------- やってみた記録（事例・ノウハウ） ---------- */
function renderRecords(events) {
  const grid = document.getElementById('casesGrid');
  document.getElementById('resultInfo').textContent = `${events.length}件の事例を表示中`;
  if (!events.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><div class="empty-title">事例が見つかりませんでした</div><div class="empty-desc">絞り込みを変えて探してみてください</div></div>`;
    return;
  }
  grid.innerHTML = events.map(ev => {
    const cat = ev.event_categories;
    const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
    const grad = THUMB_GRADIENTS[(ev.category_id - 1) % THUMB_GRADIENTS.length] || THUMB_GRADIENTS[0];
    const emoji = cat ? cat.emoji : '📚';
    const dateStr = ev.event_date || ev.event_on || '';
    return `<div class="case-card" onclick="openModal(${ev.id})">
      <div class="case-thumb" style="background:${grad}">
        <span>${emoji}</span>
        <div class="case-cat-badge ${catClass}">${cat ? cat.name : ''}</div>
      </div>
      <div class="case-body">
        <div class="case-title">${ev.title}</div>
        <div class="case-org">📍 ${ev.organizer_name || ''}　${ev.organizer_type ? '｜ ' + ev.organizer_type : ''}</div>
        <div class="case-tags">
          ${ev.target_audience ? `<span class="case-tag">👥 ${ev.target_audience}</span>` : ''}
          ${dateStr ? `<span class="case-tag">📅 ${dateStr}</span>` : ''}
          ${ev.fee ? `<span class="case-tag">💴 ${ev.fee}</span>` : '<span class="case-tag">💴 無料</span>'}
          ${ev.knowhow_summary ? '<span class="case-tag" style="background:#F0FBF5;color:var(--green)">💡 ノウハウあり</span>' : ''}
        </div>
        <div class="case-desc">${ev.description || ''}</div>
      </div>
      <div class="case-arrow">›</div>
    </div>`;
  }).join('');
}

/* ---------- モーダル（タブで出し分け） ---------- */
function openModal(id) {
  if (currentTab === 'upcoming') openEventModal(id);
  else openCaseModal(id);
}

function getSubmitLabel(type) {
  return type === 'participate' ? '✋ 参加を申し込む' : type === 'help' ? '🙌 手伝いを申し込む' : '💬 問い合わせを送る';
}
function getMsgPlaceholder(type) {
  return type === 'inquiry' ? '聞きたいことや質問をどうぞ' : '気になることや質問があれば';
}

function openEventModal(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;
  const cat = ev.event_categories;
  const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
  const org = allOrgs.find(o => o.org_name === ev.organizer_name);
  const dateStr = ev.event_date || ev.event_on || '';

  if (ev.can_participate) currentRequestType = 'participate';
  else if (ev.can_help) currentRequestType = 'help';
  else if (ev.can_inquiry) currentRequestType = 'inquiry';

  document.getElementById('modalHeader').innerHTML = `
    <div class="modal-category-badge ${catClass}">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    <div class="modal-title">${ev.title}</div>
    <div class="modal-organizer">📍 ${ev.organizer_name || ''}　${ev.organizer_type ? '｜ ' + ev.organizer_type : ''}</div>`;

  const showForm = ev.can_participate || ev.can_help || ev.can_inquiry;
  const tabCount = [ev.can_participate, ev.can_help, ev.can_inquiry].filter(Boolean).length;

  let tabsHtml = '';
  if (tabCount > 1) {
    tabsHtml = `<div class="form-tabs">
      ${ev.can_participate ? `<button class="form-tab${currentRequestType === 'participate' ? ' active' : ''}" onclick="setTab(this,'participate')">✋ 参加する</button>` : ''}
      ${ev.can_help ? `<button class="form-tab${currentRequestType === 'help' ? ' active' : ''}" onclick="setTab(this,'help')">🙌 手伝う</button>` : ''}
      ${ev.can_inquiry ? `<button class="form-tab${currentRequestType === 'inquiry' ? ' active' : ''}" onclick="setTab(this,'inquiry')">💬 お問い合わせ</button>` : ''}
    </div>`;
  }

  document.getElementById('modalBody').innerHTML = `
    <p class="modal-desc">${ev.description || ''}</p>
    <div class="info-grid">
      ${dateStr ? `<div class="info-item"><div class="info-label">🗓️ 開催時期</div><div class="info-value">${dateStr}</div></div>` : ''}
      ${ev.location ? `<div class="info-item"><div class="info-label">📍 場所</div><div class="info-value">${ev.location}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--green);font-weight:700;">🗺️ Googleマップで見る</a></div></div>` : ''}
      ${ev.target_audience ? `<div class="info-item"><div class="info-label">👥 対象</div><div class="info-value">${ev.target_audience}</div></div>` : ''}
      <div class="info-item"><div class="info-label">💴 参加費</div><div class="info-value">${ev.fee || '無料'}</div></div>
      ${ev.max_participants ? `<div class="info-item"><div class="info-label">🙋 定員</div><div class="info-value">${ev.max_participants}名</div></div>` : ''}
    </div>
    ${ev.event_url ? `<a href="${ev.event_url}" target="_blank" rel="noopener" style="display:block;background:var(--green);color:white;text-align:center;padding:13px;border-radius:14px;font-size:14px;font-weight:800;text-decoration:none;margin-bottom:16px;">🔗 イベント詳細ページを見る</a>` : ''}
    ${showForm ? `
    <div class="form-section">
      <div class="form-title">このイベントに関わる</div>
      <div class="form-sub">仕掛け人になろう！自ら動いてコンタクトする</div>
      ${tabsHtml}
      <form id="reqForm-${ev.id}" onsubmit="submitRequest(event,${ev.id})">
        <div class="form-group"><label>お名前</label><input type="text" name="name" placeholder="山田 太郎" required></div>
        <div class="form-group"><label>メールアドレス</label><input type="email" name="email" placeholder="example@mail.com" required></div>
        <div class="form-group"><label>所属（学校・団体名）</label><input type="text" name="school_name" placeholder="○○小おやじの会"></div>
        <div class="form-group"><label>メッセージ・質問</label><textarea name="message" id="msgTextarea-${ev.id}" placeholder="${getMsgPlaceholder(currentRequestType)}"></textarea></div>
        <button type="submit" class="submit-btn" id="sbtn-${ev.id}">${getSubmitLabel(currentRequestType)}</button>
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
  document.querySelectorAll('[id^="sbtn-"]').forEach(b => { b.textContent = getSubmitLabel(type); });
  document.querySelectorAll('[id^="msgTextarea-"]').forEach(t => { t.placeholder = getMsgPlaceholder(type); });
}

async function submitRequest(e, eventId) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById(`sbtn-${eventId}`);
  btn.disabled = true; btn.textContent = '送信中...';
  const { error } = await client.from('participation_requests').insert({
    event_id: eventId,
    name: form.name.value,
    email: form.email.value,
    school_name: form.school_name.value,
    request_type: currentRequestType,
    message: form.message.value
  });
  if (!error) {
    form.style.display = 'none';
    document.getElementById(`smsg-${eventId}`).style.display = 'block';
  } else {
    btn.disabled = false;
    btn.textContent = getSubmitLabel(currentRequestType);
    alert('送信に失敗しました。');
  }
}

function openCaseModal(id) {
  const ev = allRecords.find(e => e.id === id);
  if (!ev) return;
  const cat = ev.event_categories;
  const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
  const org = allOrgs.find(o => o.org_name === ev.organizer_name);
  const dateStr = ev.event_date || ev.event_on || '';

  document.getElementById('modalHeader').innerHTML = `
    <div class="modal-cat-badge ${catClass}">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    <div class="modal-title">${ev.title}</div>
    <div class="modal-org">📍 ${ev.organizer_name || ''}　${ev.organizer_type ? '｜ ' + ev.organizer_type : ''}</div>`;

  document.getElementById('modalBody').innerHTML = `
    <p class="modal-desc">${ev.description || ''}</p>
    <div class="info-grid">
      ${dateStr ? `<div class="info-item"><div class="info-label">📅 実施時期</div><div class="info-value">${dateStr}</div></div>` : ''}
      ${ev.location ? `<div class="info-item"><div class="info-label">📍 実施場所</div><div class="info-value">${ev.location}</div></div>` : ''}
      ${ev.target_audience ? `<div class="info-item"><div class="info-label">👥 対象</div><div class="info-value">${ev.target_audience}</div></div>` : ''}
      <div class="info-item"><div class="info-label">💴 参加費</div><div class="info-value">${ev.fee || '無料'}</div></div>
      ${ev.max_participants ? `<div class="info-item"><div class="info-label">🙋 参加人数</div><div class="info-value">約${ev.max_participants}名</div></div>` : ''}
      ${ev.tools_needed ? `<div class="info-item" style="grid-column:1/-1"><div class="info-label">🛠️ 必要な道具・準備物</div><div class="info-value" style="font-weight:400;font-size:13px">${ev.tools_needed}</div></div>` : ''}
    </div>
    ${ev.knowhow_summary ? `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:12px">💡 ノウハウ・ポイント</div>
      <div class="knowhow-grid">
        <div class="knowhow-box good"><div class="knowhow-title">✅ よかった点</div><div class="knowhow-text">${ev.knowhow_summary}</div></div>
        <div class="knowhow-box memo"><div class="knowhow-title">📝 企画したい人へのメモ</div><div class="knowhow-text">${ev.tips ? ev.tips : '詳細は主催団体へお問い合わせください。'}</div></div>
      </div>
    </div>` : ''}
    ${org && org.contact_email ? `<div class="contact-box"><div class="contact-title">📧 この事例について問い合わせる</div><a href="mailto:${org.contact_email}" class="contact-email">${org.contact_email}</a></div>` : ''}
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f0f0f0">
      <a href="#" onclick="switchTab('upcoming');closeModal();return false;" style="color:var(--green);font-weight:700;font-size:14px;text-decoration:none">→ 開催予定のあそびを見る</a>
    </div>`;

  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('modalCloseBtn').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modalCloseBtn').classList.remove('show');
  document.body.style.overflow = '';
}
function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
