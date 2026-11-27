/* index.html — トップの3レーン（新着の事例・支援募集中・公開予定）を本物のデータで表示する。
   以前は見本のカードを直書きしていた（2026-11-27 ひでっちの依頼で差し替え）。
   ・新着の事例   = events.status='published'（新しい順に2件）
   ・支援募集中   = events.status='recruiting'
   ・公開予定     = events.status='active' & is_public & 開催日が今日以降 ＋ 外部イベント（終了日が今日以降）
   どれも0件のときは「いまはありません」を表示する。 */
(function () {
  const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
  const MAX = 2;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const eventDay = ev => ev.event_on || (/^\d{4}-\d{2}-\d{2}$/.test(ev.event_date || '') ? ev.event_date : null);

  function card({ href, external, emoji, image, badge, badgeStyle, title, meta }) {
    const thumb = image
      ? `<div class="thumb" style="background:#eef1ee"><img src="${esc(image)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
      : `<div class="thumb">${esc(emoji || '🎪')}`;
    return `<a class="event" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''} style="text-decoration:none;color:inherit">
      ${thumb}<span class="badge"${badgeStyle ? ` style="${badgeStyle}"` : ''}>${esc(badge)}</span></div>
      <div class="event-body"><div class="event-title">${esc(title)}</div><div class="meta">${esc(meta)}</div></div>
    </a>`;
  }
  const empty = text => `<div class="meta" style="padding:16px 4px;font-size:12px">${esc(text)}</div>`;
  function fill(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

  window.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
      ['laneCases', 'laneRecruit', 'laneUpcoming'].forEach(id => fill(id, empty('読み込めませんでした。時間をおいて開き直してください')));
      return;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const today = localToday();
    let rows = [], external = [];
    try {
      const res = await client.from('events').select('*, event_categories(name, emoji)').in('status', ['active', 'published', 'recruiting']).order('id', { ascending: false });
      rows = res.data || [];
    } catch (e) { rows = []; }
    try { const r = await fetch('/data/external-events.json', { cache: 'no-cache' }); external = r.ok ? await r.json() : []; } catch (e) { external = []; }

    const catName = ev => (ev.event_categories && ev.event_categories.name) || '';
    const catEmoji = ev => (ev.event_categories && ev.event_categories.emoji) || '🎪';

    // 新着の事例・ヒント
    const cases = rows.filter(ev => ev.status === 'published').slice(0, MAX);
    fill('laneCases', cases.length ? cases.map(ev => card({
      href: `/event.html?id=${ev.id}`, emoji: catEmoji(ev), image: ev.image_url,
      badge: catName(ev) || '事例', title: ev.title, meta: ev.organizer_name || ''
    })).join('') : empty('いまは事例がありません'));

    // 支援募集中のあそび
    const recruiting = rows.filter(ev => ev.status === 'recruiting').slice(0, MAX);
    fill('laneRecruit', recruiting.length ? recruiting.map(ev => card({
      href: `/event.html?id=${ev.id}`, emoji: catEmoji(ev), image: ev.image_url,
      badge: '支援募集中', badgeStyle: 'background:#fff3e0;color:var(--orange)', title: ev.title, meta: ev.organizer_name || ''
    })).join('') : empty('いまは支援募集中のあそびはありません'));

    // 公開予定のあそび（ACP内 → 外部イベントの順）
    const upcoming = rows.filter(ev => ev.status === 'active' && ev.is_public === true && (!eventDay(ev) || eventDay(ev) >= today))
      .sort((a, b) => (eventDay(a) || '9999').localeCompare(eventDay(b) || '9999'))
      .map(ev => card({
        href: `/event.html?id=${ev.id}`, emoji: catEmoji(ev), image: ev.image_url,
        badge: catName(ev) || '開催予定', badgeStyle: 'background:#e3f2fd;color:var(--blue)', title: ev.title, meta: ev.event_date || ev.event_on || ''
      }));
    const exUpcoming = (external || []).filter(ex => !ex.end_date || ex.end_date >= today)
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
      .map(ex => card({
        href: ex.url, external: true, emoji: '🌐', image: ex.image_url,
        badge: ex.source_name || '外部イベント', badgeStyle: 'background:#e3f2fd;color:var(--blue)', title: ex.title, meta: ex.date_label || ''
      }));
    const up = upcoming.concat(exUpcoming).slice(0, MAX);
    fill('laneUpcoming', up.length ? up.join('') : empty('いまは開催予定のあそびはありません'));
  });
})();
