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
 */
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const aboutGroup = ['concept.html', 'safety.html', 'guidelines.html', 'about.html'];
  document.querySelectorAll('.nav-link[data-page], .sp-nav-link[data-page]').forEach(link => {
    const targetPage = link.getAttribute('data-page');
    if (
      targetPage === page ||
      (targetPage === 'about.html' && aboutGroup.includes(page))
    ) {
      link.classList.add('active');
    }
  });
}

// ---------- スマホ：ハンバーガーメニュー開閉 ----------

function initHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('spNav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    nav.setAttribute('aria-hidden', String(!isOpen));
  });
}

// ---------- スマホ：スクロール方向でヘッダー表示/非表示 ----------

function initMobileHeader() {
  if (window.innerWidth > 768) return;
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 60) {
      header.classList.add('header-hidden');
      document.getElementById('spNav')?.classList.remove('open');
      const btn = document.getElementById('hamburgerBtn');
      if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    } else {
      header.classList.remove('header-hidden');
    }
    lastY = y;
  }, { passive: true });
}

// ---------- ヘッダー・フッター読み込み ----------

/**
 * 一般向けヘッダー（グロナビ付き）を読み込む
 */
function loadHeader() {
  loadComponent('site-header', '/components/header.html', () => {
    setActiveNav();
    initHamburger();
    initMobileHeader();
  });
}

/**
 * メンバー向けヘッダー（企画者/支援者）を読み込む
 * cases.html / textbooks.html などで使用
 */
function loadHeaderMember() {
  loadComponent('site-header', '/components/header-member.html', () => {
    setActiveNav();
    initHamburger();
    initMobileHeader();
  });
}

/**
 * メンバー向けシンプルヘッダー（ロゴのみ）を読み込む
 * login.html で使用
 */
function loadHeaderMemberSimple() {
  loadComponent('site-header', '/components/header-member-simple.html');
}

/**
 * シンプルヘッダー（ロゴのみ）を読み込む
 */
function loadHeaderSimple() {
  loadComponent('site-header', '/components/header-simple.html');
}

/**
 * 管理ヘッダー（戻るリンク付き）を読み込む
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
