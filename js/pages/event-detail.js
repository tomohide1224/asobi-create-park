/* event.html — ACP内の企画・あそびの詳細ページ（独立URL /event.html?id=NNN）
   status別に出し分け：
   ・active     = 開催予定（参加/手伝い/問い合わせフォーム）
   ・recruiting = 募集中の企画（応援＝お気に入り/手を上げる。ログイン者のみ操作可）
   ・published  = やってみた記録（事例・ノウハウ・問い合わせ）
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
let currentRequestType = 'participate';

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

  if (ev.status === 'recruiting' && viewer !== 'guest') { await loadMarks(id); }

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
  const catClass = CAT_COLORS[ev.category_id] || 'cat-1';
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
    ${ev.location ? `<div class="info-item"><div class="info-label">📍 場所</div><div class="info-value">${ev.location}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--green);font-weight:700;">🗺️ Googleマップで見る</a></div></div>` : ''}
    ${ev.target_audience ? `<div class="info-item"><div class="info-label">👥 対象</div><div class="info-value">${ev.target_audience}</div></div>` : ''}
    <div class="info-item"><div class="info-label">💴 参加費</div><div class="info-value">${ev.fee || '無料'}</div></div>
    ${ev.max_participants ? `<div class="info-item"><div class="info-label">🙋 定員</div><div class="info-value">${ev.max_participants}名</div></div>` : ''}
  </div>`;
}

function render() {
  const head = `
    ${buildHero()}
    <h1 class="detail-title">${ev.title}</h1>
    <div class="detail-org">📍 ${ev.organizer_name || ''}${ev.organizer_type ? '　｜ ' + ev.organizer_type : ''}</div>
    ${ev.description ? `<div class="detail-desc">${ev.description}</div>` : ''}
    ${buildInfoGrid()}`;

  let action = '';
  if (ev.status === 'published') action = buildCaseAction();
  else if (ev.status === 'recruiting') action = buildRecruitAction();
  else action = buildUpcomingAction();

  const back = `<a href="/events.html" class="detail-back">← あそびを探すに戻る</a>`;
  document.getElementById('detailContent').innerHTML = head + action + back;
}

/* ---------- 開催予定：参加/手伝い/問い合わせフォーム ---------- */
function getSubmitLabel(type) {
  return type === 'participate' ? '✋ 参加を申し込む' : type === 'help' ? '🙌 手伝いを申し込む' : '💬 問い合わせを送る';
}
function getMsgPlaceholder(type) {
  return type === 'inquiry' ? '聞きたいことや質問をどうぞ' : '気になることや質問があれば';
}

function buildUpcomingAction() {
  if (ev.can_participate) currentRequestType = 'participate';
  else if (ev.can_help) currentRequestType = 'help';
  else if (ev.can_inquiry) currentRequestType = 'inquiry';

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

  const linkBtn = ev.event_url
    ? `<a href="${ev.event_url}" target="_blank" rel="noopener" style="display:block;background:var(--green);color:white;text-align:center;padding:13px;border-radius:14px;font-size:14px;font-weight:800;text-decoration:none;margin:8px 0 16px;">🔗 イベント詳細ページを見る</a>`
    : '';

  if (!showForm) return linkBtn;

  return `${linkBtn}
    <div class="form-section">
      <div class="form-title">このイベントに関わる</div>
      <div class="form-sub">仕掛け人になろう！自ら動いてコンタクトする</div>
      ${tabsHtml}
      <form id="reqForm" onsubmit="submitRequest(event)">
        <div class="form-group"><label>お名前</label><input type="text" name="name" placeholder="山田 太郎" required></div>
        <div class="form-group"><label>メールアドレス</label><input type="email" name="email" placeholder="example@mail.com" required></div>
        <div class="form-group"><label>所属（学校・団体名）</label><input type="text" name="school_name" placeholder="○○小おやじの会"></div>
        <div class="form-group"><label>メッセージ・質問</label><textarea name="message" id="msgTextarea" placeholder="${getMsgPlaceholder(currentRequestType)}"></textarea></div>
        <button type="submit" class="submit-btn" id="sbtn">${getSubmitLabel(currentRequestType)}</button>
        <div class="success-msg" id="smsg">🎉 送信しました！後ほどご連絡します。</div>
      </form>
    </div>`;
}

function setTab(btn, type) {
  currentRequestType = type;
  document.querySelectorAll('.form-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sbtn = document.getElementById('sbtn'); if (sbtn) sbtn.textContent = getSubmitLabel(type);
  const ta = document.getElementById('msgTextarea'); if (ta) ta.placeholder = getMsgPlaceholder(type);
}

async function submitRequest(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('sbtn');
  btn.disabled = true; btn.textContent = '送信中...';
  const { error } = await client.from('participation_requests').insert({
    event_id: ev.id,
    name: form.name.value,
    email: form.email.value,
    school_name: form.school_name.value,
    request_type: currentRequestType,
    message: form.message.value
  });
  if (!error) {
    form.style.display = 'none';
    document.getElementById('smsg').style.display = 'block';
  } else {
    btn.disabled = false;
    btn.textContent = getSubmitLabel(currentRequestType);
    alert('送信に失敗しました。');
  }
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
        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="toggleFav(this)">${isFav ? '❤️' : '🤍'} お気に入り</button>
        <button class="btn-hand ${isHand ? 'active' : ''}" ${isHand ? 'disabled' : 'onclick="openHandModal()"'}>${isHand ? '✅ 手を上げた' : '🙋 手を上げる'}</button>
      </div>
      ${note}
    </div>`;
}

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
    btn.classList.remove('active'); btn.innerHTML = '🤍 お気に入り';
  } else {
    await client.from('favorite_plans').insert({ supporter_id: mySupporterId, event_id: ev.id });
    favSet.add(ev.id);
    btn.classList.add('active'); btn.innerHTML = '❤️ お気に入り';
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

/* ---------- やってみた記録：ノウハウ・問い合わせ ---------- */
function buildCaseAction() {
  const knowhow = ev.knowhow_summary ? `
    <div class="detail-section-title">💡 ノウハウ・ポイント</div>
    <div class="knowhow-grid">
      <div class="knowhow-box good"><div class="knowhow-title">✅ よかった点</div><div class="knowhow-text">${ev.knowhow_summary}</div></div>
      <div class="knowhow-box memo"><div class="knowhow-title">📝 企画したい人へのメモ</div><div class="knowhow-text">${ev.tips ? ev.tips : '詳細は主催団体へお問い合わせください。'}</div></div>
    </div>` : '';
  const tools = ev.tools_needed ? `
    <div class="detail-section-title">🛠️ 必要な道具・準備物</div>
    <div class="detail-desc" style="margin-bottom:8px;">${ev.tools_needed}</div>` : '';
  const contactEmail = (org && org.contact_email) || ev.contact_email;
  const contact = contactEmail ? `
    <div class="contact-box" style="margin-top:20px;"><div class="contact-title">📧 この事例について問い合わせる</div><a href="mailto:${contactEmail}" class="contact-email">${contactEmail}</a></div>` : '';
  return tools + knowhow + contact;
}
