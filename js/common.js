/* ============================================================
   ASOBI CREATE PARK — 共通JS
   全ページで読み込む。コンポーネント読み込み・ナビアクティブ制御。
   ============================================================ */

// ---------- コンポーネント読み込み ----------

/**
 * HTMLコンポーネントをfetchして指定要素に挿入する
 * @param {string} id     - 挿入先の要素ID
 * @param {string} path   - コンポーネントHTMLのパス
 * @param {Function} [callback] - 挿入後に実行する処理
 */
async function loadComponent(id, path, callback) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    el.innerHTML = await res.text();
    if (callback) callback();
  } catch (e) {
    console.error('[loadComponent]', e);
  }
}

// ---------- アクティブナビの自動設定 ----------

/**
 * 現在のページに対応するナビリンクにactiveクラスを付与する
 * data-page属性で対応ページを指定。
 * サブページ（concept/safety/guidelinesなど）はdata-parent属性でグループ指定。
 */
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  // about配下のページをグループ化
  const aboutGroup = ['concept.html', 'safety.html', 'guidelines.html', 'about.html'];

  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const targetPage = link.getAttribute('data-page');
    if (
      targetPage === page ||
      (targetPage === 'about.html' && aboutGroup.includes(page))
    ) {
      link.classList.add('active');
    }
  });
}

// ---------- ヘッダー・フッター読み込み ----------

/**
 * 標準ヘッダー（グロナビ付き）を読み込む
 */
function loadHeader() {
  loadComponent('site-header', '/components/header.html', setActiveNav);
}

/**
 * シンプルヘッダー（ロゴのみ）を読み込む — login.htmlで使用
 */
function loadHeaderSimple() {
  loadComponent('site-header', '/components/header-simple.html');
}

/**
 * 管理ヘッダー（戻るリンク付き）を読み込む
 * @param {string} [backLabel] - 戻るリンクのテキスト（省略時は「← 管理画面に戻る」）
 * @param {string} [backHref]  - 戻るリンクのURL（省略時は /login.html）
 */
function loadHeaderAdmin(backLabel, backHref) {
  loadComponent('site-header', '/components/header-admin.html', () => {
    const link = document.getElementById('adminBackLink');
    if (!link) return;
    if (backLabel) link.textContent = backLabel;
    if (backHref)  link.href = backHref;
  });
}

/**
 * フッターを読み込む
 */
function loadFooter() {
  loadComponent('site-footer', '/components/footer.html');
}
