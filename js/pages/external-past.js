/* events.html 追加：外部イベント(data/external-events.json)の「開催中/終了」振り分け
   ・end_date（YYYY-MM-DD）が今日より前 → 終了（履歴）。end_date 未設定は開催中扱い。
   ・基本は開催中・これからを表示（開始日順）。終了分は一覧の下に「📦 終了したイベント」として折りたたみで残す。
   ・image_url が無いイベントは、ジャンル別のデフォルト画像（SVGをその場で生成）を表示する。
   events.js の後に読み込み、switchTab / renderUpcoming / externalCardHtml をラップする。 */
(function () {
  let splitFrom = null;          // 振り分け済みの配列（再振り分け防止）
  let allExternalPast = [];

  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function ensureSplit() {
    if (allExternal === splitFrom) return;
    const today = localToday();
    const isPast = ex => !!ex.end_date && ex.end_date < today;
    const list = allExternal || [];
    allExternalPast = list.filter(isPast)
      .sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));      // 最近終わった順
    allExternal = list.filter(ex => !isPast(ex))
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '') || (a.end_date || '').localeCompare(b.end_date || ''));
    splitFrom = allExternal;
  }

  function matchExternal(ex) {
    const q = (document.getElementById('searchInput').value || '').toLowerCase();
    if (activeCat !== 'all' && ex.category_id != activeCat) return false;
    if (q && !(ex.title || '').toLowerCase().includes(q) && !(ex.venue || '').toLowerCase().includes(q) && !(ex.source_name || '').toLowerCase().includes(q)) return false;
    return true;
  }

  const origExternalCardHtml = externalCardHtml;
  // ジャンル別デフォルト画像：[ラベル, 絵文字, 空色, 丘色, 濃い色]
  const DEFAULT_ART = {
    1: ['自然・生き物', '🌿', '#c8e6c9', '#81c784', '#4caf50'],
    2: ['川・水辺', '🌊', '#bbdefb', '#64b5f6', '#1e88e5'],
    3: ['まちあそび', '🛝', '#e1bee7', '#ba68c8', '#8e24aa'],
    4: ['スポーツ', '⚽', '#fff3c4', '#ffd54f', '#f9a825'],
    5: ['マルシェ・縁日', '🏮', '#f8bbd0', '#f06292', '#d81b60'],
    6: ['工作・ものづくり', '🔨', '#b2ebf2', '#4dd0e1', '#00838f'],
    7: ['ワークショップ', '🎨', '#ffccbc', '#ff8a65', '#e64a19'],
    8: ['地域・防災', '🏠', '#d7ccc8', '#a1887f', '#6d4c41'],
    9: ['子育て・児童館', '🧸', '#ffe0b2', '#ffb74d', '#ef6c00'],
    10: ['地域のイベント', '🎈', '#c5cae9', '#7986cb', '#3949ab'],
  };
  const artCache = {};
  function defaultImage(ex) {
    const n = DEFAULT_ART[Number(ex.category_id)] ? Number(ex.category_id) : 10;
    if (artCache[n]) return artCache[n];
    const [name, emo, light, mid, dark] = DEFAULT_ART[n];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
      <rect width="800" height="600" fill="url(#s)"/>
      <circle cx="660" cy="110" r="78" fill="#fff59d" opacity=".35"/><circle cx="660" cy="110" r="56" fill="#fff59d"/>
      <g fill="#fff" opacity=".9"><ellipse cx="150" cy="110" rx="70" ry="26"/><ellipse cx="200" cy="92" rx="48" ry="30"/><ellipse cx="470" cy="70" rx="54" ry="20"/><ellipse cx="505" cy="58" rx="34" ry="22"/></g>
      <path d="M0 430 Q200 340 400 420 T800 400 V600 H0Z" fill="${mid}" opacity=".55"/>
      <path d="M0 480 Q180 420 360 470 T800 450 V600 H0Z" fill="${mid}"/>
      <path d="M0 540 Q220 500 420 535 T800 520 V600 H0Z" fill="${dark}" opacity=".85"/>
      <circle cx="400" cy="260" r="118" fill="#fff" opacity=".95"/>
      <circle cx="400" cy="260" r="118" fill="none" stroke="${mid}" stroke-width="8" stroke-dasharray="4 14" stroke-linecap="round"/>
      <text x="400" y="302" font-size="120" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emo}</text>
      <rect x="240" y="410" width="320" height="56" rx="28" fill="#fff" opacity=".95"/>
      <text x="400" y="448" font-size="28" font-weight="800" text-anchor="middle" fill="${dark}" font-family="Hiragino Kaku Gothic ProN,Hiragino Sans,Noto Sans JP,Meiryo,sans-serif">${name}</text>
    </svg>`;
    return (artCache[n] = 'data:image/svg+xml,' + encodeURIComponent(svg));
  }
  externalCardHtml = function (ex) {
    return origExternalCardHtml(ex.image_url ? ex : Object.assign({}, ex, { image_url: defaultImage(ex) }));
  };
  function pastCardHtml(ex) {
    return externalCardHtml(Object.assign({}, ex, { status_label: '終了しました' }))
      .replace('<div class="event-card"', '<div class="event-card is-past"');
  }

  const origSwitchTab = switchTab;
  switchTab = function (tab) { ensureSplit(); return origSwitchTab(tab); };

  const origRenderUpcoming = renderUpcoming;
  renderUpcoming = function (events, externals) {
    ensureSplit();
    origRenderUpcoming(events, externals);
    const pasts = allExternalPast.filter(matchExternal);
    if (!pasts.length) return;
    const grid = document.getElementById('eventsGrid');
    grid.insertAdjacentHTML('beforeend', `<details class="past-events" style="grid-column:1/-1">
      <summary>📦 終了したイベント（${pasts.length}件）</summary>
      <div class="events-grid past-events-grid">${pasts.map(pastCardHtml).join('')}</div>
    </details>`);
  };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .past-events { margin-top: 12px; }
    .past-events > summary { cursor: pointer; list-style: none; padding: 12px 16px; border-radius: 14px; background: #F0F0F0; color: #666; font-size: 13px; font-weight: 700; }
    .past-events > summary::-webkit-details-marker { display: none; }
    .past-events > summary::after { content: '▼'; float: right; font-size: 11px; transition: transform .2s; }
    .past-events[open] > summary::after { transform: rotate(180deg); }
    .past-events-grid { margin-top: 16px; }
    .event-card.is-past { opacity: .6; filter: grayscale(.5); }
    .event-card.is-past:hover { opacity: .85; }
  </style>`);
})();
