/* ============================================================
   ASOBI CREATE PARK — 団体ダッシュボード「企画をさがす」タブ
   支援者機能（企画一覧・お気に入り・手を上げる）を団体ユーザーに開放。
   前提: login.html のインラインスクリプトで SUPABASE_URL /
   SUPABASE_ANON_KEY / escHtml が先に定義されていること。
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
      fetch(`${SUPABASE_URL}/rest/v1/plans?status=eq.recruiting&order=created_at.desc`, { headers: sbHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/favorite_plans?supporter_id=eq.${supporterId}`, { headers: sbHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/support_hands?supporter_id=eq.${supporterId}`, { headers: sbHeaders() }),
    ]);
    const [plans, favs, hands] = await Promise.all([plansRes.json(), favRes.json(), handRes.json()]);
    const favSet = new Set(favs.map(f => f.plan_id));
    const handSet = new Set(hands.map(h => h.plan_id));
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
  const catEmoji = {'食事・屋台':'🍜','あそび':'🎮','防災':'🚒','工作':'✂️','水遊び':'💧','音楽':'🎵','スポーツ':'⚽'}[plan.category] || '🎪';
  const statusLabel = {recruiting:'🟢 支援者募集中', closed:'🔒 締め切り済み'}[plan.status] || plan.status;
  card.innerHTML = `
    <div class="plan-img">${catEmoji}</div>
    <div class="plan-body">
      <span class="plan-status ${plan.status}">${statusLabel}</span>
      <div class="plan-title">${escHtml(plan.title || '')}</div>
      <div class="plan-meta">
        ${plan.target_date ? `<span>📅 ${plan.target_date}</span>` : ''}
        ${plan.location ? `<span>📍 ${escHtml(plan.location)}</span>` : ''}
      </div>
      <div class="plan-actions">
        <button class="btn-fav ${isFav?'active':''}" onclick="toggleFav(${plan.id},${supporterId},this)">${isFav?'❤️':'🤍'} お気に入り</button>
        <button class="btn-hand ${isHand?'active':''}" ${isHand?'':'onclick="openHandModal('+plan.id+','+supporterId+')"'}>${isHand?'✅ 手を上げた':'🙋 手を上げる'}</button>
      </div>
    </div>`;
  return card;
}

async function toggleFav(planId, supporterId, btn) {
  if (btn.classList.contains('active')) {
    await fetch(`${SUPABASE_URL}/rest/v1/favorite_plans?supporter_id=eq.${supporterId}&plan_id=eq.${planId}`, { method: 'DELETE', headers: sbHeaders() });
    btn.classList.remove('active'); btn.textContent = '🤍 お気に入り';
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/favorite_plans`, { method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ supporter_id: supporterId, plan_id: planId }) });
    btn.classList.add('active'); btn.textContent = '❤️ お気に入り';
  }
}

/* 手を上げるモーダル */
let _handPlanId = null, _handSupporterId = null;
function openHandModal(planId, supporterId) { _handPlanId = planId; _handSupporterId = supporterId; document.getElementById('handMessage').value = ''; document.getElementById('handModal').classList.add('open'); }
function closeHandModal() { document.getElementById('handModal').classList.remove('open'); }

async function submitHand() {
  const message = document.getElementById('handMessage').value.trim();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/support_hands`, { method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ supporter_id: _handSupporterId, plan_id: _handPlanId, message: message || null, status: 'pending' }) });
    closeHandModal();
    const card = document.querySelector(`.plan-card[data-plan-id="${_handPlanId}"]`);
    if (card) { const b = card.querySelector('.btn-hand'); if (b) { b.classList.add('active'); b.textContent = '✅ 手を上げた'; b.onclick = null; } }
  } catch (e) { alert('エラー：' + e.message); }
}
