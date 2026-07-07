/* messages.js — チャットUI
   ※Phase C Step1: 企画は events テーブルに統合。support_hands / messages は event_id 参照。 */
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

let currentUser = null;
let handId = null;
let supportHand = null;
let plan = null;
let otherName = '';
let pollTimer = null;
let lastMessageId = 0;

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  handId = params.get('hand_id');

  if (!handId) {
    showError('URLが正しくありません（hand_id が必要です）');
    return;
  }

  const orgStr = sessionStorage.getItem('acp_org');
  const supStr = sessionStorage.getItem('acp_supporter');

  if (orgStr) {
    const org = JSON.parse(orgStr);
    currentUser = { type: 'organizer', id: org.id, name: org.org_name };
  } else if (supStr) {
    const sup = JSON.parse(supStr);
    currentUser = { type: 'supporter', id: sup.id, name: sup.display_name };
  } else {
    showError('ログインが必要です');
    document.getElementById('inputArea').style.display = 'none';
    return;
  }

  await loadThread();
  startPolling();
  enableInput();
});

function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    location.href = currentUser && currentUser.type === 'organizer' ? '/login.html' : '/supporter.html';
  }
}

async function loadThread() {
  try {
    const shRes = await fetch(
      SUPABASE_URL + '/rest/v1/support_hands?id=eq.' + handId + '&select=*',
      { headers: HEADERS }
    );
    const shData = await shRes.json();
    if (!shData.length) throw new Error('申込が見つかりません');
    supportHand = shData[0];

    if (currentUser.type === 'supporter' && supportHand.supporter_id !== currentUser.id) {
      throw new Error('このメッセージを表示する権限がありません');
    }

    const planRes = await fetch(
      SUPABASE_URL + '/rest/v1/events?id=eq.' + supportHand.event_id + '&select=id,title,organization_id',
      { headers: HEADERS }
    );
    const planData = await planRes.json();
    if (!planData.length) throw new Error('企画が見つかりません');
    plan = planData[0];

    if (currentUser.type === 'organizer' && plan.organization_id !== currentUser.id) {
      throw new Error('このメッセージを表示する権限がありません');
    }

    if (currentUser.type === 'organizer') {
      const supRes = await fetch(
        SUPABASE_URL + '/rest/v1/supporters?id=eq.' + supportHand.supporter_id + '&select=display_name',
        { headers: HEADERS }
      );
      const supData = await supRes.json();
      otherName = (supData[0] && supData[0].display_name) || '支援者';
    } else {
      const orgRes = await fetch(
        SUPABASE_URL + '/rest/v1/organizations?id=eq.' + plan.organization_id + '&select=org_name',
        { headers: HEADERS }
      );
      const orgData = await orgRes.json();
      otherName = (orgData[0] && orgData[0].org_name) || '企画者';
    }

    document.getElementById('headerName').textContent = otherName + ' さんとのメッセージ';
    document.getElementById('headerPlan').textContent = '📋 ' + plan.title;

    var statusEl = document.getElementById('handStatus');
    var statusMap = { pending: '検討中', accepted: '承認済み', declined: '見送り' };
    var statusClass = { pending: 'pending', accepted: 'accepted', declined: 'declined' };
    statusEl.textContent = statusMap[supportHand.status] || supportHand.status;
    statusEl.className = 'hand-status ' + (statusClass[supportHand.status] || '');

    await loadMessages(true);
  } catch (e) {
    showError(e.message);
  }
}

async function loadMessages(initial) {
  try {
    var url = lastMessageId > 0
      ? SUPABASE_URL + '/rest/v1/messages?support_hand_id=eq.' + handId + '&id=gt.' + lastMessageId + '&order=created_at.asc'
      : SUPABASE_URL + '/rest/v1/messages?support_hand_id=eq.' + handId + '&order=created_at.asc';

    var res = await fetch(url, { headers: HEADERS });
    var msgs = await res.json();

    if (initial) {
      renderMessages(msgs);
    } else if (msgs.length > 0) {
      appendMessages(msgs);
    }

    if (msgs.length > 0) {
      lastMessageId = msgs[msgs.length - 1].id;
    }

    await markRead();
  } catch (e) {
    // ポーリング中エラーは無視
  }
}

function renderMessages(msgs) {
  var el = document.getElementById('msgList');

  if (msgs.length === 0) {
    el.innerHTML = '<div class="msg-center"><div class="msg-center-icon">💬</div><div class="msg-center-text">まだメッセージはありません。<br>最初のメッセージを送ってみましょう！</div></div>';
    return;
  }

  el.innerHTML = '';
  var lastDate = '';
  msgs.forEach(function(msg) {
    var dateStr = formatDate(msg.created_at);
    if (dateStr !== lastDate) {
      var divider = document.createElement('div');
      divider.className = 'msg-date-divider';
      divider.textContent = dateStr;
      el.appendChild(divider);
      lastDate = dateStr;
    }
    el.appendChild(buildBubble(msg));
  });
  el.dataset.lastDate = lastDate;

  scrollToBottom();
}

function appendMessages(msgs) {
  var el = document.getElementById('msgList');
  var center = el.querySelector('.msg-center');
  if (center) el.innerHTML = '';

  var lastDate = el.dataset.lastDate || '';
  msgs.forEach(function(msg) {
    var dateStr = formatDate(msg.created_at);
    if (dateStr !== lastDate) {
      var divider = document.createElement('div');
      divider.className = 'msg-date-divider';
      divider.textContent = dateStr;
      el.appendChild(divider);
      lastDate = dateStr;
    }
    el.appendChild(buildBubble(msg));
  });
  el.dataset.lastDate = lastDate;
  scrollToBottom();
}

function buildBubble(msg) {
  var isMe = (msg.sender_type === currentUser.type && msg.sender_id === currentUser.id);
  var timeStr = formatTime(msg.created_at);
  var readStr = (isMe && msg.read_at) ? '既読' : '';
  var avatar = isMe ? '🧑' : (currentUser.type === 'organizer' ? '🤝' : '🌿');

  var row = document.createElement('div');
  row.className = 'msg-row' + (isMe ? ' me' : '');
  row.innerHTML =
    '<div class="msg-avatar">' + avatar + '</div>' +
    '<div>' +
      '<div class="msg-meta">' +
        (readStr ? '<span class="msg-read">' + readStr + '</span>' : '') +
        '<span class="msg-time">' + timeStr + '</span>' +
      '</div>' +
      '<div class="msg-bubble">' + escHtml(msg.content) + '</div>' +
    '</div>';
  return row;
}

async function sendMessage() {
  var input = document.getElementById('msgInput');
  var content = input.value.trim();
  if (!content) return;

  var btn = document.getElementById('sendBtn');
  btn.disabled = true;
  input.disabled = true;

  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/messages', {
      method: 'POST',
      headers: Object.assign({}, HEADERS, { 'Prefer': 'return=representation' }),
      body: JSON.stringify({
        support_hand_id: parseInt(handId),
        event_id: plan.id,
        sender_type: currentUser.type,
        sender_id: currentUser.id,
        content: content,
      }),
    });

    if (!res.ok) {
      var err = await res.json();
      throw new Error((err && err.message) || '送信に失敗しました');
    }

    var data = await res.json();
    var newMsg = Array.isArray(data) ? data[0] : data;
    input.value = '';
    input.style.height = '';

    var el = document.getElementById('msgList');
    var center = el.querySelector('.msg-center');
    if (center) el.innerHTML = '';
    el.appendChild(buildBubble(newMsg));
    scrollToBottom();

    lastMessageId = newMsg.id;
  } catch (e) {
    alert('エラー: ' + e.message);
  } finally {
    btn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

async function markRead() {
  var otherType = currentUser.type === 'organizer' ? 'supporter' : 'organizer';
  await fetch(
    SUPABASE_URL + '/rest/v1/messages?support_hand_id=eq.' + handId + '&sender_type=eq.' + otherType + '&read_at=is.null',
    {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    }
  ).catch(function() {});
}

function startPolling() {
  pollTimer = setInterval(function() {
    loadMessages(false);
  }, 8000);
}

function enableInput() {
  var input = document.getElementById('msgInput');
  var btn = document.getElementById('sendBtn');
  input.addEventListener('input', function() {
    btn.disabled = input.value.trim().length === 0;
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function scrollToBottom() {
  var el = document.getElementById('msgList');
  el.scrollTop = el.scrollHeight;
}

function showError(msg) {
  var el = document.getElementById('msgList');
  el.innerHTML = '<div class="msg-center"><div class="msg-center-icon">⚠️</div><div class="msg-center-text">' + escHtml(msg) + '</div></div>';
  document.getElementById('inputArea').style.display = 'none';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/\n/g,'<br>');
}

function formatDate(iso) {
  var d = new Date(iso);
  var today = new Date();
  var yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return '今日';
  if (d.toDateString() === yesterday.toDateString()) return '昨日';
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

window.addEventListener('beforeunload', function() {
  if (pollTimer) clearInterval(pollTimer);
});
