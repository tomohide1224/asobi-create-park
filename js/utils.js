/* ============================================================
   ASOBI CREATE PARK — 汎用ユーティリティ
   ============================================================ */

// ---------- トースト通知 ----------

/**
 * トースト通知を表示する
 * @param {string} message - メッセージ
 * @param {'success'|'error'|''} [type] - 種別（省略時はデフォルト色）
 * @param {number} [duration] - 表示時間ms（デフォルト3000）
 */
function showToast(message, type = '', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------- ローディング・空・エラー状態 ----------

function showLoading(container, message = '読み込み中...') {
  if (typeof container === 'string') container = document.getElementById(container);
  if (!container) return;
  container.innerHTML = `<div class="loading-state">${message}</div>`;
}

function showEmpty(container, message = 'データがありません') {
  if (typeof container === 'string') container = document.getElementById(container);
  if (!container) return;
  container.innerHTML = `<div class="empty-state">${message}</div>`;
}

function showError(container, message = 'データの取得に失敗しました') {
  if (typeof container === 'string') container = document.getElementById(container);
  if (!container) return;
  container.innerHTML = `
    <div class="error-state">
      <p>${message}</p>
      <button onclick="location.reload()">再読み込み</button>
    </div>
  `;
}

// ---------- バリデーション ----------

/**
 * フォームバリデーション
 * @param {Array} fields - [{name, value, rules: {required, maxLength, pattern, message}}]
 * @returns {Object} エラーマップ {フィールド名: エラーメッセージ}
 */
function validateForm(fields) {
  const errors = {};
  fields.forEach(({ name, value, rules }) => {
    if (!rules) return;
    const v = (value || '').toString().trim();
    if (rules.required && !v) {
      errors[name] = '必須項目です';
    } else if (rules.maxLength && v.length > rules.maxLength) {
      errors[name] = `${rules.maxLength}文字以内で入力してください`;
    } else if (rules.pattern && !rules.pattern.test(v)) {
      errors[name] = rules.message || '入力形式が正しくありません';
    }
  });
  return errors;
}

/**
 * フィールドエラーを表示する
 * @param {Object} errors - {フィールド名: エラーメッセージ}
 */
function showFieldErrors(errors) {
  // 既存エラーをクリア
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

  Object.entries(errors).forEach(([name, msg]) => {
    const field = document.querySelector(`[name="${name}"]`);
    if (!field) return;
    field.classList.add('error');
    const errEl = document.createElement('p');
    errEl.className = 'field-error';
    errEl.textContent = msg;
    field.insertAdjacentElement('afterend', errEl);
  });
}

/**
 * フォームエラーをクリアする
 */
function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

// ---------- 日付フォーマット ----------

/**
 * ISO日付文字列を日本語表示にフォーマット
 * @param {string} isoString
 * @returns {string} 例: 2025年3月15日
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * ISO日付文字列を日時表示にフォーマット
 * @param {string} isoString
 * @returns {string} 例: 2025年3月15日 14:30
 */
function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(isoString)} ${hh}:${mm}`;
}

// ---------- URLパラメータ ----------

/**
 * URLパラメータを取得する
 * @param {string} key
 * @returns {string|null}
 */
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}
