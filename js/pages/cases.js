/* cases.html 固有スクリプト */
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
const CAT_COLORS = ['','cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8'];
const THUMB_GRADIENTS = ['linear-gradient(135deg,#a5d6a7,#81c784)','linear-gradient(135deg,#90caf9,#64b5f6)','linear-gradient(135deg,#ce93d8,#ab47bc)','linear-gradient(135deg,#ffe082,#ffca28)','linear-gradient(135deg,#f48fb1,#e91e63)','linear-gradient(135deg,#80deea,#00acc1)','linear-gradient(135deg,#ffab91,#ff5722)','linear-gradient(135deg,#bcaaa4,#8d6e63)'];

let client, allEvents = [], allCategories = [], allOrgs = [];
let activeCat = 'all', knowhowOnly = false;

window.addEventListener('DOMContentLoaded', async () => {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const [catsRes, eventsRes, orgsRes] = await Promise.all([
    client.from('event_categories').select('*').order('id'),
    client.from('events').select('*, event_categories(name, emoji)').eq('status', 'published').order('id'),
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

  applyFilters();
});

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
  document.querySelector('#catChips .filter-chip[data-cat="all"]').classList.add('active');
  document.getElementById('chipKnowhow').classList.remove('active');
  applyFilters();
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  let filtered = allEvents.filter(ev => {
    if (activeCat !== 'all' && ev.category_id != activeCat) return false;
    if (knowhowOnly && !ev.knowhow_summary) return false;
    if (q && !ev.title.toLowerCase().includes(q) && !(ev.organizer_name||'').toLowerCase().includes(q)) return false;
    return true;
  });
  renderCases(filtered);
}

function renderCases(events) {
  const grid = document.getElementById('casesGrid');
  document.getElementById('resultInfo').textContent = `${events.length}件の事例を表示中`;
  if (!events.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">事例が見つかりませんでした</div><div class="empty-desc">絞り込みを変えて探してみてください</div></div>`;
    return;
  }
  grid.innerHTML = events.map(ev => {
    const cat = ev.event_categories;
    const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
    const grad = THUMB_GRADIENTS[(ev.category_id - 1) % THUMB_GRADIENTS.length] || THUMB_GRADIENTS[0];
    const emoji = cat ? cat.emoji : '📚';
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
          ${ev.event_date ? `<span class="case-tag">📅 ${ev.event_date}</span>` : ''}
          ${ev.fee ? `<span class="case-tag">💴 ${ev.fee}</span>` : '<span class="case-tag">💴 無料</span>'}
          ${ev.knowhow_summary ? '<span class="case-tag" style="background:#F0FBF5;color:var(--green)">💡 ノウハウあり</span>' : ''}
        </div>
        <div class="case-desc">${ev.description || ''}</div>
      </div>
      <div class="case-arrow">›</div>
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
    <div class="modal-cat-badge ${catClass}">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    <div class="modal-title">${ev.title}</div>
    <div class="modal-org">📍 ${ev.organizer_name || ''}　${ev.organizer_type ? '｜ ' + ev.organizer_type : ''}</div>`;

  document.getElementById('modalBody').innerHTML = `
    <p class="modal-desc">${ev.description || ''}</p>
    <div class="info-grid">
      ${ev.event_date ? `<div class="info-item"><div class="info-label">📅 実施時期</div><div class="info-value">${ev.event_date}</div></div>` : ''}
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
        <div class="knowhow-box memo"><div class="knowhow-title">📝 企画したい人へのメモ</div><div class="knowhow-text">詳細は主催団体へお問い合わせください。</div></div>
      </div>
    </div>` : ''}
    ${org && org.contact_email ? `<div class="contact-box"><div class="contact-title">📧 この事例について問い合わせる</div><a href="mailto:${org.contact_email}" class="contact-email">${org.contact_email}</a></div>` : ''}
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f0f0f0">
      <a href="/events.html" style="color:var(--green);font-weight:700;font-size:14px;text-decoration:none">→ このジャンルのあそびに参加・手伝う</a>
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
