/* ============================================================
   ASOBI CREATE PARK — Supabase APIラッパー
   Supabase接続情報はここだけに書く。他のJSから import して使う。
   ============================================================ */

const SUPABASE_URL      = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8';
const SUPABASE_FUNC_URL = `${SUPABASE_URL}/functions/v1`;

// ---------- 共通ヘッダー ----------

function _headers(extra = {}) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ---------- エラーハンドリング ----------

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function _handleApiError(e) {
  if (e instanceof ApiError) {
    if (e.status === 401) {
      // セッション切れ → ログインへ
      window.location.href = `/login.html?redirect=${encodeURIComponent(location.pathname)}`;
      return;
    }
    if (e.status === 403) {
      showToast('権限がありません', 'error');
      return;
    }
    if (e.status === 404) {
      showToast('データが見つかりません', 'error');
      return;
    }
    if (e.status >= 500) {
      showToast('サーバーエラーが発生しました。時間をおいて再試行してください。', 'error');
      return;
    }
  }
  // ネットワークエラー
  showToast('通信エラーが発生しました。インターネット接続を確認してください。', 'error');
  console.error('[NetworkError]', e);
}

async function _fetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    _handleApiError(e);
    throw e;
  }
}

// ---------- CRUD ----------

/**
 * テーブルからデータを取得する
 * @param {string} table   - テーブル名
 * @param {string} [query] - クエリパラメータ文字列（例: 'status=eq.active&order=created_at.desc'）
 */
async function dbGet(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  return _fetch(url, { headers: _headers() });
}

/**
 * テーブルにデータを挿入する
 * @param {string} table - テーブル名
 * @param {Object} data  - 挿入するデータ
 */
async function dbInsert(table, data) {
  return _fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: _headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(data),
  });
}

/**
 * テーブルのデータを更新する
 * @param {string} table - テーブル名
 * @param {string} query - 絞り込み条件（例: 'id=eq.123'）
 * @param {Object} data  - 更新するデータ
 */
async function dbUpdate(table, query, data) {
  return _fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: _headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(data),
  });
}

/**
 * テーブルのデータを削除する
 * @param {string} table - テーブル名
 * @param {string} query - 絞り込み条件（例: 'id=eq.123'）
 */
async function dbDelete(table, query) {
  return _fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: _headers(),
  });
}

// ---------- ストレージ ----------

/**
 * Supabase Storageにファイルをアップロードする
 * @param {string} bucket - バケット名
 * @param {string} path   - 保存先パス
 * @param {File}   file   - アップロードするファイル
 * @returns {string} 公開URL
 */
async function storageUpload(bucket, path, file) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ---------- Edge Functions ----------

/**
 * Supabase Edge Functionを呼び出す
 * @param {string} funcName - 関数名
 * @param {Object} body     - リクエストボディ
 */
async function callFunction(funcName, body = {}) {
  return _fetch(`${SUPABASE_FUNC_URL}/${funcName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
