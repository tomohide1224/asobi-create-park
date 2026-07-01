/* applicants.js — 支援申込の管理 */
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

var org = null;
var planId = null;
var allHands = [];
var currentFilter = 'all';

window.addEventListener('DOMContentLoaded', async function() {
  var orgStr = sessionStorage.getItem('acp_org');
  if (!orgStr) {
    location.href = '/login.html';
    return;
  }
  org = JSON.parse(orgStr);

  var params = new URLSearchParams(window.location.search);
  planId = params.get('plan_id');
  if (!planId) {
    showEmpty('URLが正しくありません（plan_id が必要です）');
    return;
  }

  await loadData();
});

function goBack() {
  if (history.length > 1) history.back();
  else location.href = '/plans-manage.html';
}

async function loadData() {
  try {
    // 企画情報
    var planRes = await fetch(
      SUPABASE_URL + '/rest/v1/plans?id=eq.' + planId + '&select=id,title,organization_id',
      { headers: HEADERS }
    );
    var plans = await planRes.json();
    if (!plans.length || plans[0].organization_id !== org.id) {
      showEmpty('企画が見つかりません、またはアクセス権がありません');
      return;
    }
    document.getElementById('planTitle').textContent = plans[0].title;

    // support_hands 取得
    var shRes = await fetch(
      SUPABASE_URL + '/rest/v1/support_hands?plan_id=eq.' + planId + '&order=created_at.desc',
      { headers: HEADERS }
    );
    var hands = await shRes.json();

    if (!hands.length) {
      showEmpty('まだ支援申込はありません');
      document.getElementById('countBadge').textContent = '0件';
      return;
    }

    // supporter情報を一括取得
    var supIds = hands.map(function(h) { return h.supporter_id; }).join(',');
    var supRes = await fetch(
      SUPABASE_URL + '/rest/v1/supporters?id=in.(' + supIds + ')&select=id,display_name,profile_image',
      { headers: HEADERS }
    );
    var supporters = await supRes.json();
    var supMap = {};
    supporters.forEach(function(s) { supMap[s.id] = s; });

    allHands = hands.map(function(h) {
      return Object.assign({}, h, { supporter: supMap[h.supporter_id] || null });
    });

    document.getElementById('countBadge').textContent = allHands.length + '件';
    renderCards();
  } catch(e) {
    showEmpty('読み込みに失敗しました: ' + e.message);
  }
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.filter === filter);
  });
  renderCards();
}

function renderCards() {
  var filtered = currentFilter === 'all'
    ? allHands
    : allHands.filter(function(h) { return h.status === currentFilter; });

  var area = document.getElementById('cardArea');

  if (!filtered.length) {
    area.innerHTML = '<div class="center-msg"><div class="center-msg-icon">📭</div><div class="center-msg-text">該当する申込がありません</div></div>';
    return;
  }

  var html = '<div class="card-list">';
  filtered.forEach(function(hand) {
    var sup = hand.supporter;
    var name = (sup && sup.display_name) ? escHtml(sup.display_name) : '名前未設定';
    var date = new Date(hand.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
    var statusLabel = { pending: '⏳ 検討中', accepted: '✅ 承認済み', declined: '❌ 見送り' };
    var statusClass = { pending: 'pending', accepted: 'accepted', declined: 'declined' };

    var acceptBtn = hand.status === 'accepted'
      ? '<button class="btn-accept" disabled>✅ 承認済み</button>'
      : '<button class="btn-accept" onclick="updateStatus(' + hand.id + ',\'accepted\')">✅ 承認する</button>';

    var declineBtn = hand.status === 'declined'
      ? '<button class="btn-decline" disabled>❌ 見送り済み</button>'
      : '<button class="btn-decline" onclick="updateStatus(' + hand.id + ',\'declined\')">❌ 見送り</button>';

    html +=
      '<div class="applicant-card" id="hand-' + hand.id + '">' +
        '<div class="card-top">' +
          '<div class="card-avatar">' + (sup && sup.profile_image ? '<img src="' + escHtml(sup.profile_image) + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">' : '🤝') + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + name + '</div>' +
            '<div class="card-date">申込日: ' + date + '</div>' +
            (hand.message ? '<div class="card-message">' + escHtml(hand.message) + '</div>' : '') +
            '<span class="card-status ' + (statusClass[hand.status] || '') + '">' + (statusLabel[hand.status] || hand.status) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          acceptBtn +
          declineBtn +
          '<button class="btn-msg" onclick="openMessage(' + hand.id + ')">💬 メッセージ</button>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  area.innerHTML = html;
}

async function updateStatus(handId, newStatus) {
  var card = document.getElementById('hand-' + handId);
  if (card) {
    card.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
  }

  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/support_hands?id=eq.' + handId,
      {
        method: 'PATCH',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'return=representation' }),
        body: JSON.stringify({ status: newStatus }),
      }
    );
    if (!res.ok) throw new Error('更新に失敗しました');

    allHands = allHands.map(function(h) {
      return h.id === handId ? Object.assign({}, h, { status: newStatus }) : h;
    });

    var label = newStatus === 'accepted' ? '承認しました ✅' : '見送りにしました';
    showToast(label);
    renderCards();
  } catch(e) {
    alert('エラー: ' + e.message);
    if (card) {
      card.querySelectorAll('button').forEach(function(b) { b.disabled = false; });
    }
  }
}

function openMessage(handId) {
  location.href = '/messages.html?hand_id=' + handId;
}

function showEmpty(msg) {
  document.getElementById('cardArea').innerHTML =
    '<div class="center-msg"><div class="center-msg-icon">📭</div><div class="center-msg-text">' + escHtml(msg) + '</div></div>';
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
