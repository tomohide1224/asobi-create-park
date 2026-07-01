/* ============================================================
   ASOBI CREATE PARK — 認証管理
   セッション取得・認証チェック・ログアウト
   ============================================================ */

const SESSION_KEY = 'acp_session';

// ---------- セッション管理 ----------

/**
 * セッションを保存する
 * @param {Object} user - ユーザー情報
 */
function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/**
 * セッションを取得する
 * @returns {Object|null} ユーザー情報、未ログインならnull
 */
function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * セッションを削除する（ログアウト）
 */
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ---------- 認証チェック ----------

/**
 * 認証が必要なページで呼ぶ。未ログインならlogin.htmlへリダイレクト。
 * @returns {Object|null} ユーザー情報
 */
function requireAuth() {
  const user = getSession();
  if (!user) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(location.pathname)}`;
    return null;
  }
  return user;
}

/**
 * 現在のユーザーを取得する（認証チェックなし）
 * @returns {Object|null} ユーザー情報
 */
function getCurrentUser() {
  return getSession();
}

// ---------- ログアウト ----------

/**
 * ログアウトしてトップページへ遷移する
 */
function logout() {
  clearSession();
  window.location.href = '/index.html';
}
