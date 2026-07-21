/* event.html — ACP内の企画・あそびの詳細ページ（独立URL /event.html?id=NNN）
   フロント（見る人）向けビュー。status別に出し分け：
   ・active     = 開催予定（情報＋地図＋「気になる」）
   ・recruiting = 募集中の企画（情報＋地図＋応援＝お気に入り/手を上げる）
   ・published  = やってみた記録（情報＋地図＋ノウハウ＋「気になる」）
   ※フロントには参加/手伝い/問い合わせフォームは置かない（管理は event-manage 側）。
   一覧(events.html)の内部イベントカードから遷移してくる。外部イベントは対象外。 */
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
const CAT_COLORS = ['', 'cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8'];
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

let client, ev = null, cat = null, org = null;
let viewer = 'guest', currentOrg = null, currentSup = null, mySupporterId = null;
let favSet = new Set(), handSet = new Set();

function detectViewer() {
  try { const o = sessionStorage.getItem('acp_org'); if (o) { currentOrg = JSON.parse(o); if (currentOrg && currentOrg.id) viewer = 'org'; } } catch (e) {}
  if (viewer === 'guest') {
    try { const s = sessionStorage.getItem('acp_supporter'); if (s) { currentSup = JSON.parse(s); if (currentSup && currentSup.id) viewer = 'sup'; } } catch (e) {}
  }
  if (viewer === 'sup') mySupporterId = currentSup.id;
}

function getEventId() {
  const raw = new URLSearchParams(location.search).get('id');
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

window.addEventListener('DOMContentLoaded', async () => {
  detectViewer();
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const id = getEventId();
  if (!id) { renderNotFound(); return; }

  const { data, error } = await client
    .from('events')
    .select('*, event_categories(name, emoji)')
    .eq('id', id)
    .single();
  if (error || !data) { renderNotFound(); return; }
  ev = data;
  cat = ev.event_categories;

  if (ev.organizer_name) {
    const { data: orgs } = await client.from('organizations').select('*').eq('org_name', ev.organizer_name).limit(1);
    org = (orgs && orgs[0]) || null;
  }

  if (viewer !== 'guest') { await loadMarks(id); }

  document.title = `${ev.title} | ASOBI CREATE PARK`;
  const crumb = document.getElementById('crumbTitle');
  if (crumb) crumb.textContent = ev.title;

  render();
});

function renderNotFound() {
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-notfound">
      <div class="nf-icon">🔍</div>
      <div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:8px;">あそびが見つかりませんでした</div>
      <div style="font-size:14px;margin-bottom:22px;">削除されたか、公開が終了した可能性があります。</div>
      <a href="/events.html" class="detail-back">← あそびを探すに戻る</a>
    </div>`;
}

function statusBadge(status) {
  if (status === 'recruiting') return '🌱 募集中の企画';
  if (status === 'published') return '📚 やってみた記録';
  return '🎪 開催予定';
}

function buildHero() {
  const grad = THUMB_GRADIENTS[((ev.category_id || 1) - 1) % THUMB_GRADIENTS.length] || THUMB_GRADIENTS[0];
  const emoji = cat ? cat.emoji : '🎪';
  const catColorMap = ['', '#66bb6a', '#42a5f5', '#ab47bc', '#ffca28', '#e91e63', '#00acc1', '#ff5722', '#8d6e63'];
  const badgeColor = catColorMap[ev.category_id] || '#66bb6a';
  const inner = ev.image_url
    ? `<img src="${ev.image_url}" alt="${ev.title}" onerror="this.style.display='none'">`
    : `<span class="hero-emoji">${emoji}</span>`;
  const bg = ev.image_url ? '#eef1ee' : grad;
  return `<div class="detail-hero" style="background:${bg}">
    ${inner}
    ${cat ? `<div class="detail-cat-badge" style="background:${badgeColor}">${cat.emoji} ${cat.name}</div>` : ''}
    <div class="detail-status-badge">${statusBadge(ev.status)}</div>
  </div>`;
}

function buildInfoGrid() {
  const dateStr = ev.event_date || ev.event_on || '';
  return `<div class="info-grid">
    ${dateStr ? `<div class="info-item"><div class="info-label">🗓️ 開催時期</div><div class="info-value">${dateStr}</div></div>` : ''}
    ${ev.location ? `<div class="info-item"><div class="info-label">📍 場所</div><div class="info-value">${ev.location}</div></div>` : ''}
    ${ev.target_audience ? `<div class="info-item"><div class="info-label">👥 対象</div><div class="info-value">${ev.target_audience}</div></div>` : ''}
    <div class="info-item"><div class="info-label">💴 参加費</div><div class="info-value">${ev.fee || '無料'}</div></div>
    ${ev.max_participants ? `<div class="info-item"><div class="info-label">🙋 定員</div><div class="info-value">${ev.max_participants}名</div></div>` : ''}
  </div>`;
}

/* Googleマップ埋め込み（APIキー不要）＋ 地図の補足情報 */
function buildMap() {
  if (!ev.location) return '';
  const q = encodeURIComponent(ev.location);
  const note = ev.location_note
    ? `<div class="detail-map-note">📝 ${ev.location_note}</div>`
    : '';
  return `<div class="detail-section-title">📍 場所・アクセス</div>
    <div class="detail-map-wrap">
      <iframe class="detail-map" src="https://www.google.com/maps?q=${q}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>
    <a class="detail-map-link" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">🗺️ Googleマップで大きく見る →</a>
    ${note}`;
}

function render() {
  const head = `
    ${buildHero()}
    <h1 class="detail-title">${ev.title}</h1>
    <div class="detail-org">📍 ${ev.organizer_name || ''}${ev.organizer_type ? '　｜ ' + ev.organizer_type : ''}</div>
    ${ev.description ? `<div class="detail-desc">${ev.description}</div>` : ''}
    ${buildInfoGrid()}
    ${buildMap()}`;

  let action = '';
  if (ev.status === 'published') action = buildCaseAction();
  else if (ev.status === 'recruiting') action = buildRecruitAction();
  else action = buildInterestAction();

  const back = `<a href="/events.html" class="detail-back">← あそびを探すに戻る</a>`;
  document.getElementById('detailContent').innerHTML = head + action + back;
}

/* ---------- 「気になる」（開催予定・事例の応援） ---------- */
function buildInterestAction() {
  const isFav = favSet.has(ev.id);
  const note = viewer === 'guest'
    ? `<div class="form-sub" style="margin-top:8px;">※ ログインすると「気になる」に登録できます</div>`
    : '';
  return `<div class="form-section">
      <div class="form-title">🌱 このあそびを応援する</div>
      <div class="form-sub">気になったら登録しておこう。あなたの「気になる」が主催者の励みになります。</div>
      <div class="recruit-actions" style="margin-top:12px">
        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="toggleFav(this)">${isFav ? '❤️ 気になる登録済み' : '🤍 気になる'}</button>
      </div>
      ${note}
    </div>`;
}

/* ---------- 募集中の企画：応援（お気に入り／手を上げる） ---------- */
function buildRecruitAction() {
  const isFav = favSet.has(ev.id);
  const isHand = handSet.has(ev.id);
  const note = viewer === 'guest'
    ? `<div class="form-sub" style="margin-top:8px;">※ ログインすると、お気に入り登録や手を上げることができます</div>`
    : '';
  return `<div class="form-section">
      <div class="form-title">🌱 この企画を応援する</div>
      <div class="form-sub">お気に入り登録や、手を上げて主催者に気持ちを届けよう</div>
      <div class="recruit-actions" style="margin-top:12px">
        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="toggleFav(this)">${isFav ? '❤️ 気になる登録済み' : '🤍 気になる'}</button>
        <button class="btn-hand ${isHand ? 'active' : ''}" ${isHand ? 'disabled' : 'onclick="openHandModal()"'}>${isHand ? '✅ 手を上げた' : '🙋 手を上げる'}</button>
      </div>
      ${note}
    </div>`;
}

/* ---------- やってみた記録：ノウハウ ---------- */
function buildCaseAction() {
  const tools = ev.tools_needed ? `
    <div class="detail-section-title">🛠️ 必要な道具・準備物</div>
    <div class="detail-desc" style="margin-bottom:8px;">${ev.tools_needed}</div>` : '';
  const knowhow = ev.knowhow_summary ? `
    <div class="detail-section-title">💡 ノウハウ・ポイント</div>
    <div class="knowhow-grid">
      <div class="knowhow-box good"><div class="knowhow-title">✅ よかった点</div><div class="knowhow-text">${ev.knowhow_summary}</div></div>
      <div class="knowhow-box memo"><div class="knowhow-title">📝 企画したい人へのメモ</div><div class="knowhow-text">${ev.tips ? ev.tips : '詳細は主催団体へお問い合わせください。'}</div></div>
    </div>` : '';
  return tools + knowhow + buildInterestAction();
}

/* ---------- 応援：supporter名寄せ・お気に入り・手を上げる ---------- */
async function loadMarks(id) {
  if (!mySupporterId) mySupporterId = await ensureSupporterId();
  if (!mySupporterId) return;
  const [favRes, handRes] = await Promise.all([
    client.from('favorite_plans').select('event_id').eq('supporter_id', mySupporterId).eq('event_id', id),
    client.from('support_hands').select('event_id').eq('supporter_id', mySupporterId).eq('event_id', id),
  ]);
  favSet = new Set((favRes.data || []).map(f => f.event_id));
  handSet = new Set((handRes.data || []).map(h => h.event_id));
}

async function ensureSupporterId() {
  if (currentSup && currentSup.id) return currentSup.id;
  const o = currentOrg || {};
  const lineUid = sessionStorage.getItem('acp_line_user_id') || o.line_user_id;
  if (!lineUid) return null;
  const { data: found } = await client.from('supporters').select('*').eq('line_user_id', lineUid).limit(1);
  if (found && found.length) { sessionStorage.setItem('acp_supporter', JSON.stringify(found[0])); return found[0].id; }
  const name = sessionStorage.getItem('acp_line_name') || o.rep_name || o.org_name || '支援者';
  const { data: created } = await client.from('supporters').insert({ line_user_id: lineUid, display_name: name }).select();
  if (created && created.length) { sessionStorage.setItem('acp_supporter', JSON.stringify(created[0])); return created[0].id; }
  return null;
}

async function toggleFav(btn) {
  if (!mySupporterId) mySupporterId = await ensureSupporterId();
  if (!mySupporterId) { alert('ログインすると応援できます'); return; }
  if (favSet.has(ev.id)) {
    await client.from('favorite_plans').delete().eq('supporter_id', mySupporterId).eq('event_id', ev.id);
    favSet.delete(ev.id);
    btn.classList.remove('active'); btn.innerHTML = '🤍 気になる';
  } else {
    await client.from('favorite_plans').insert({ supporter_id: mySupporterId, event_id: ev.id });
    favSet.add(ev.id);
    btn.classList.add('active'); btn.innerHTML = '❤️ 気になる登録済み';
  }
}

function openHandModal() {
  document.getElementById('handMessage').value = '';
  document.getElementById('handModal').classList.add('open');
}
function closeHandModal() { document.getElementById('handModal').classList.remove('open'); }

async function submitHand() {
  if (!mySupporterId) mySupporterId = await ensureSupporterId();
  if (!mySupporterId) { alert('ログインすると手を上げられます'); return; }
  const msg = document.getElementById('handMessage').value.trim();
  const { error } = await client.from('support_hands').insert({ supporter_id: mySupporterId, event_id: ev.id, message: msg || null, status: 'pending' });
  if (error) { alert('エラー：' + error.message); return; }
  handSet.add(ev.id);
  closeHandModal();
  const hb = document.querySelector('.btn-hand');
  if (hb) { hb.classList.add('active'); hb.disabled = true; hb.innerHTML = '✅ 手を上げた'; hb.onclick = null; }
}
