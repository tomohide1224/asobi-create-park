/* textbooks.js — 教科書エリア */
var SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';

var allBooks = [];
var currentFilter = 'all';
var currentModal = null;

// ── データ読み込み ──
window.addEventListener('DOMContentLoaded', async function() {
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/textbooks?status=eq.published&order=created_at.asc&select=*',
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        }
      }
    );
    allBooks = await res.json();
    buildFilters();
    renderCards();
  } catch(e) {
    document.getElementById('cardArea').innerHTML =
      '<div class="state-msg"><div class="state-icon">⚠️</div><div>読み込みに失敗しました</div></div>';
  }
});

// ── フィルタービルド ──
function buildFilters() {
  var cats = [];
  allBooks.forEach(function(b) {
    if (b.category && cats.indexOf(b.category) === -1) cats.push(b.category);
  });
  var wrap = document.getElementById('filterWrap');
  cats.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.onclick = function() { setFilter(cat); };
    wrap.appendChild(btn);
  });
}

// ── フィルター ──
function setFilter(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(function(c) {
    c.classList.toggle('active', c.dataset.cat === cat);
  });
  renderCards();
}

// ── カード描画 ──
function renderCards() {
  var filtered = currentFilter === 'all'
    ? allBooks
    : allBooks.filter(function(b) { return b.category === currentFilter; });

  var area = document.getElementById('cardArea');

  if (!filtered.length) {
    area.innerHTML = '<div class="state-msg"><div class="state-icon">📭</div><div>記事がありません</div></div>';
    return;
  }

  var html = '<div class="card-grid">';
  filtered.forEach(function(book) {
    var tags = (book.tags || []).map(function(t) {
      return '<span class="tb-tag">#' + escHtml(t) + '</span>';
    }).join('');

    var emoji = catEmoji(book.category);

    html +=
      '<div class="tb-card" onclick="openModal(' + book.id + ')">' +
        '<div class="tb-card-thumb">' +
          (book.thumbnail_url
            ? '<img src="' + escHtml(book.thumbnail_url) + '" alt="">'
            : emoji) +
          (book.category ? '<span class="tb-card-cat">' + escHtml(book.category) + '</span>' : '') +
        '</div>' +
        '<div class="tb-card-body">' +
          '<div class="tb-card-title">' + escHtml(book.title) + '</div>' +
          '<div class="tb-card-summary">' + escHtml(book.summary || '') + '</div>' +
          '<div class="tb-card-tags">' + tags + '</div>' +
          '<div class="tb-card-footer">' +
            '<div class="tb-author">' + (book.author ? '✍️ ' + escHtml(book.author) : '') + '</div>' +
            '<button class="btn-detail" onclick="event.stopPropagation();openModal(' + book.id + ')">詳しく見る</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  area.innerHTML = html;
}

// ── モーダル ──
function openModal(id) {
  var book = allBooks.find(function(b) { return b.id === id; });
  if (!book) return;
  currentModal = book;

  document.getElementById('modalCat').textContent = book.category || '';
  document.getElementById('modalTitle').textContent = book.title;
  document.getElementById('modalContent').textContent = book.content || book.summary || '';

  var tagsHtml = (book.tags || []).map(function(t) {
    return '<span class="tb-tag">#' + escHtml(t) + '</span>';
  }).join('');
  document.getElementById('modalTags').innerHTML = tagsHtml;

  var dlBtn = document.getElementById('modalDlBtn');
  dlBtn.onclick = function() { downloadSingleAsExcel(book); };

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentModal = null;
}

// ── Excel: 全件 ──
function downloadAllAsExcel() {
  if (!allBooks.length) { alert('データがありません'); return; }

  var rows = [['タイトル', 'カテゴリ', '概要', '内容', '著者', 'タグ', '作成日']];
  allBooks.forEach(function(b) {
    rows.push([
      b.title || '',
      b.category || '',
      b.summary || '',
      b.content || '',
      b.author || '',
      (b.tags || []).join(', '),
      b.created_at ? new Date(b.created_at).toLocaleDateString('ja-JP') : '',
    ]);
  });

  exportExcel(rows, 'ASOBI_CREATE_PARK_教科書一覧');
}

// ── Excel: 単件 ──
function downloadSingleAsExcel(book) {
  var rows = [
    ['項目', '内容'],
    ['タイトル', book.title || ''],
    ['カテゴリ', book.category || ''],
    ['概要', book.summary || ''],
    ['内容', book.content || ''],
    ['著者', book.author || ''],
    ['タグ', (book.tags || []).join(', ')],
    ['作成日', book.created_at ? new Date(book.created_at).toLocaleDateString('ja-JP') : ''],
  ];
  var safeName = (book.title || 'textbook').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
  exportExcel(rows, 'ACP_' + safeName);
}

// ── SheetJS エクスポート ──
function exportExcel(rows, filename) {
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = rows[0].map(function(_, i) {
    var maxLen = rows.reduce(function(max, row) {
      return Math.max(max, String(row[i] || '').length);
    }, 0);
    return { wch: Math.min(Math.max(maxLen, 10), 60) };
  });

  XLSX.utils.book_append_sheet(wb, ws, '教科書一覧');
  XLSX.writeFile(wb, filename + '.xlsx');
}

// ── ユーティリティ ──
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function catEmoji(cat) {
  var map = {
    'イベント設計': '🎪', '広報・マーケティング': '📣',
    '組織運営': '🏢', '地域連携': '🤝', '資金調達': '💰'
  };
  return map[cat] || '📚';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModalDirect();
});
