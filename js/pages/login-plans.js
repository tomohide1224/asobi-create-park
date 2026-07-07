/* ============================================================
   ASOBI CREATE PARK — 団体ダッシュボード「企画をさがす」タブ
   支援者機能（企画一覧・お気に入り・手を上げる）を団体ユーザーに開放。
   前提: login.html のインラインスクリプトで SUPABASE_URL /
   SUPABASE_ANON_KEY / escHtml が先に定義されていること。
   ※Phase C Step1: 企画データは events テーブル(status=recruiting)に統合。
     参照列は event_id。
   ============================================================ */

function sbHeaders() {
  return { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
}

/* 団体ユーザーの supporter レコードを取得（無ければ自動作成） */
async function ensureSupporterId() {
  try {
    const s = sessionStorage.getItem('acp_supporter');
    if (s) { const sp = JSON.parse(s); if (sp && sp.id) return sp.id; }
  } catch (e) {}
  const org = JSON.parse(sessionStorage.getItem('acp_org') || '{}');
  const lineUid = sessionStorage.getItem('acp_line_user_id') || org.line_user_id;
  if (!lineUid) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/supporters?line_user_id=eq.${encodeURIComponent(lineUid)}&limit=1`, { headers: sbHeaders() });
  if (res.ok) {
    const arr = await res.json();
    if (arr.length) { sessionStorage.setItem('acp_supporter', JSON.stringify(arr[0])); return arr[0].id; }
  }
  const name = sessionStorage.getItem('acp_line_name') || org.rep_name || org.org_name || '支援者';
  const cres = await fetch(`${SUPABASE_URL}/rest/v1/supporters`, { method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'return=representation' }, body: JSON.stringify({ line_user_id: lineUid, display_name: name }) });
  if (!cres.ok) return null;
  const [sp] = await cres.json();
  sessionStorage.setItem('acp_supporter', JSON.stringify(sp));
  return sp.id;
}

/* 企画一覧の読み込み（タブを開くたびに実行） */
async function loadPlansTab() {
  const container = document.getElementById('plansList');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>読み込み中...</p></div>';
  try {
    const supporterId = await ensureSupporterId();
    if (!supporterId) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>セッションが確認できません。もう一度ログインしてください。</p></div>'; return; }
    const [plansRes, favRes, handRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.recruiting&select=*,event_categories(name,emoji)&order=created_at.desc`, { headers: sbHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/favorite_plans?supporter_id=eq.${supporterId}`, { headers: sbHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/support_hands?supporter_id=eq.${supporterId}`, { headers: sbHeaders() }),
    ]);
    const [plans, favs, hands] = await Promise.all([plansRes.json(), favRes.json(), handRes.json()]);
    const favSet = new Set(favs.map(f => f.event_id));
    const handSet = new Set(hands.map(h => h.event_id));
    if (!plans.length) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>現在募集中の企画はありません。</p></div>'; return; }
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'plans-grid';
    plans.forEach(plan => grid.appendChild(buildPlanCard(plan, favSet.has(plan.id), handSet.has(plan.id), supporterId)));
    container.appendChild(grid);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>読み込みエラー：${escHtml(e.message)}</p></div>`;
  }
}

function buildPlanCard(plan, isFav, isHand, supporterId) {
  const card = document.createElement('div');
  card.className = 'plan-card'; card.dataset.planId = plan.id;
  const cat = plan.event_categories || null;
  const catEmoji = (cat && cat.emoji) ? cat.emoji : '🎪';
  const statusLabel = {recruiting:'🟢 支援者募集中', closed:'🔒 締め切り済み'}[plan.status] || plan.status;
  card.innerHTML = `
    <div class="plan-img">${catEmoji}</div>
    <div class="plan-body">
      <span class="plan-status ${plan.status}">${statusLabel}</span>
      <div class="plan-title">${escHtml(plan.title || '')}</div>
      <div class="plan-meta">
        ${plan.event_date ? `<span>📅 ${escHtml(plan.event_date)}</span>` : ''}
        ${plan.location ? `<span>📍 ${escHtml(plan.location)}</span>` : ''}
      </div>
      <div class="plan-actions">
        <button class="btn-fav ${isFav?'active':''}" onclick="toggleFav(${plan.id},${supporterId},this)">${isFav?'❤️':'🤍'} お気に入り</button>
        <button class="btn-hand ${isHand?'active':''}" ${isHand?'':'onclick="openHandModal('+plan.id+','+supporterId+')"'}>${isHand?'✅ 手を上げた':'🙋 手を上げる'}</button>
      </div>
    </div>`;
  return card;
}

async function toggleFav(eventId, supporterId, btn) {
  if (btn.classList.contains('active')) {
    await fetch(`${SUPABASE_URL}/rest/v1/favorite_plans?supporter_id=eq.${supporterId}&event_id=eq.${eventId}`, { method: 'DELETE', headers: sbHeaders() });
    btn.classList.remove('active'); btn.textContent = '🤍 お気に入り';
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/favorite_plans`, { method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ supporter_id: supporterId, event_id: eventId }) });
    btn.classList.add('active'); btn.textContent = '❤️ お気に入り';
  }
}

/* 手を上げるモーダル */
let _handPlanId = null, _handSupporterId = null;
function openHandModal(eventId, supporterId) { _handPlanId = eventId; _handSupporterId = supporterId; document.getElementById('handMessage').value = ''; document.getElementById('handModal').classList.add('open'); }
function closeHandModal() { document.getElementById('handModal').classList.remove('open'); }

async function submitHand() {
  const message = document.getElementById('handMessage').value.trim();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/support_hands`, { method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ supporter_id: _handSupporterId, event_id: _handPlanId, message: message || null, status: 'pending' }) });
    closeHandModal();
    const card = document.querySelector(`.plan-card[data-plan-id="${_handPlanId}"]`);
    if (card) { const b = card.querySelector('.btn-hand'); if (b) { b.classList.add('active'); b.textContent = '✅ 手を上げた'; b.onclick = null; } }
  } catch (e) { alert('エラー：' + e.message); }
}

/* ============================================================
   支援者モード（Phase B）
   支援者ログインでも団体と同じ統合ダッシュボードを表示する。
   違いは「イベントを作れるか」だけ：
   ・イベントタブ → 団体登録への誘い
   ・問い合わせタブ → 自分が出した参加申請の状況
   ・団体情報タブ／統計 → 非表示
   ============================================================ */

function showSupporterDashboard(supporter) {
  if (supporter && supporter.line_user_id && !sessionStorage.getItem('acp_line_user_id')) {
    sessionStorage.setItem('acp_line_user_id', supporter.line_user_id);
  }
  document.getElementById('dashOrg').textContent = supporter.display_name || '支援者';
  document.getElementById('dashWelcome').textContent = '🤝 支援者として利用中';
  const iconEl = document.getElementById('dashOrgIcon');
  if (iconEl) {
    if (supporter.profile_image) { iconEl.innerHTML = `<img src="${escHtml(supporter.profile_image)}" class="dash-org-logo" alt="">`; }
    else { iconEl.innerHTML = '<div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#e8f5ee;border-radius:50%;">🤝</div>'; }
  }
  const camBadge = document.querySelector('.logo-cam-badge'); if (camBadge) camBadge.style.display = 'none';
  const stats = document.querySelector('.dash-stats-row'); if (stats) stats.style.display = 'none';
  const orgTab = document.querySelector('[data-tab="orginfo"]'); if (orgTab) orgTab.style.display = 'none';
  const evTitle = document.querySelector('#pane-events .dash-section-title'); if (evTitle) evTitle.textContent = 'イベントをつくるには';
  const evList = document.getElementById('events-list');
  if (evList) evList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎪</div>
      <p>イベントの登録・公開は「企画者登録」をした方ができます（団体・個人どちらでもOK）。<br>あなたの「やってみたい」を、イベントにしませんか？</p>
      <button class="btn-line" style="max-width:320px;margin:20px auto 0;" onclick="startOrgRegister()">🏢 企画者として登録する</button>
    </div>`;
  const postBtn = document.querySelector('.dash-post-btn'); if (postBtn) postBtn.style.display = 'none';
  const reqTitle = document.querySelector('#pane-requests .dash-section-title'); if (reqTitle) reqTitle.textContent = '自分が申し込んだ参加申請・問い合わせ';
  loadSupporterRequests(supporter);
  showPhase('phase4');
  document.querySelector('.page-wrap').classList.add('dashboard-mode');
  switchTab('plans');
}

function startOrgRegister() {
  const lineName = sessionStorage.getItem('acp_line_name');
  const repEl = document.getElementById('reg_rep_name');
  if (lineName && repEl && !repEl.value) repEl.value = lineName;
  document.querySelector('.page-wrap').classList.remove('dashboard-mode');
  showPhase('phase5');
}

async function loadSupporterRequests(supporter) {
  const el = document.getElementById('requests-list');
  if (!el) return;
  el.innerHTML = '<div class="dash-loading">⚙️ 読み込み中...</div>';
  const lineUid = sessionStorage.getItem('acp_line_user_id') || supporter.line_user_id;
  if (!lineUid) { el.innerHTML = '<div class="dash-empty">⚠️ ユーザー情報が取得できませんでした</div>'; return; }
  try {
    const reqRes = await fetch(`${SUPABASE_URL}/rest/v1/participation_requests?line_user_id=eq.${encodeURIComponent(lineUid)}&order=created_at.desc`, { headers: sbHeaders() });
    const requests = reqRes.ok ? await reqRes.json() : [];
    if (!requests.length) { el.innerHTML = '<div class="dash-empty">💭 まだ参加申請・問い合わせはありません<br><small>気になるイベントに申し込むと、ここに履歴と返信が表示されます</small></div>'; return; }
    const eventMap = {};
    const ids = [...new Set(requests.map(r => r.event_id).filter(Boolean))].join(',');
    if (ids) {
      const evRes = await fetch(`${SUPABASE_URL}/rest/v1/events?id=in.(${ids})&select=id,title`, { headers: sbHeaders() });
      (evRes.ok ? await evRes.json() : []).forEach(e => { eventMap[e.id] = e.title; });
    }
    const typeLabel = { participate: '参加希望', help: '手伝い希望', inquiry: 'お問い合わせ' };
    const items = requests.map(r => {
      const date = new Date(r.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
      const type = typeLabel[r.request_type] || r.request_type || 'お問い合わせ';
      const replyHtml = r.reply ? `<div class="request-message">💬 団体からの返信：${escHtml(r.reply)}</div>` : `<div class="request-message" style="color:var(--gray);">⏳ 返信待ち</div>`;
      return `<div class="request-item"><div class="request-event-tag">📅 ${escHtml(eventMap[r.event_id] || 'イベント')}</div><div class="request-header"><div><span class="request-type-badge">${escHtml(type)}</span></div><div class="request-date">${date}</div></div>${replyHtml}</div>`;
    }).join('');
    el.innerHTML = `<div class="request-list">${items}</div>`;
  } catch (e) { el.innerHTML = '<div class="dash-empty">⚠️ データの読み込みに失敗しました</div>'; }
}
