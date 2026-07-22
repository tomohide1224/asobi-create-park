/* お気に入り（気になる）— Airbnb風。
   ・localStorage を主ストアにして、未ログインでもハートを押せる。
   ・ログインしている場合は DB(favorite_plans) にもミラー保存し、ページ表示時に同期する。
   一覧(events.js)と詳細(event-detail.js)の両方から使う共有モジュール。 */
const ACP_FAV_KEY = 'acp_favs';

function acpFavSet() {
  try { return new Set(JSON.parse(localStorage.getItem(ACP_FAV_KEY) || '[]')); } catch (e) { return new Set(); }
}
function acpFavSave(set) {
  try { localStorage.setItem(ACP_FAV_KEY, JSON.stringify([...set])); } catch (e) {}
}
function acpIsFav(id) { return acpFavSet().has(id); }

/* ハートのトグル。localStorage を更新し、ログイン時は DB にもミラー。戻り値＝トグル後の状態(true=登録) */
async function acpToggleFav(id, client, supporterId) {
  const s = acpFavSet();
  let now;
  if (s.has(id)) { s.delete(id); now = false; } else { s.add(id); now = true; }
  acpFavSave(s);
  if (client && supporterId) {
    try {
      if (now) await client.from('favorite_plans').insert({ supporter_id: supporterId, event_id: id });
      else await client.from('favorite_plans').delete().eq('supporter_id', supporterId).eq('event_id', id);
    } catch (e) {}
  }
  return now;
}

/* ログイン時：localStorage のお気に入りを DB に取り込む（不足分だけ挿入） */
async function acpSyncFavs(client, supporterId) {
  if (!client || !supporterId) return;
  const local = [...acpFavSet()];
  if (!local.length) return;
  try {
    const { data } = await client.from('favorite_plans').select('event_id').eq('supporter_id', supporterId);
    const have = new Set((data || []).map(r => r.event_id));
    const missing = local.filter(id => !have.has(id));
    if (missing.length) await client.from('favorite_plans').insert(missing.map(id => ({ supporter_id: supporterId, event_id: id })));
  } catch (e) {}
}
