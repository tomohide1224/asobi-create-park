/* events.html 追加：外部イベント(data/external-events.json)の「開催中/終了」振り分け
   ・end_date（YYYY-MM-DD）が今日より前 → 終了（履歴）。end_date 未設定は開催中扱い。
   ・基本は開催中・これからを表示（開始日順）。終了分は一覧の下に「📦 終了したイベント」として折りたたみで残す。
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
  function pastCardHtml(ex) {
    return origExternalCardHtml(Object.assign({}, ex, { status_label: '終了しました' }))
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
