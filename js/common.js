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
    const res = await fetch(path, { cache: 'no-cache' });
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
  const asobiGroup = ['events.html', 'cases.html'];
  document.querySelectorAll('.nav-link[data-page], .sp-nav-link[data-page]').forEach(link => {
    const targetPage = link.getAttribute('data-page');
    if (
      targetPage === page ||
      (targetPage === 'about.html' && aboutGroup.includes(page)) ||
      (targetPage === 'events.html' && asobiGroup.includes(page))
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

// ---------- ヘッダーのログインユーザー表示 ----------

/**
 * ログイン中なら、ヘッダー右上をアイコン＋名前＋役割バッジ（企画者/支援者）に置き換える。
 * 未ログインなら何もしない（従来のログインボタンのまま）。
 */
function applyHeaderUser() {
  let user = null;
  try {
    const org = JSON.parse(sessionStorage.getItem('acp_org') || 'null');
    if (org && org.id) {
      user = { name: org.org_name || '企画者', img: org.logo_url || null, role: 'org' };
    } else {
      const sup = JSON.parse(sessionStorage.getItem('acp_supporter') || 'null');
      if (sup && sup.id) user = { name: sup.display_name || '支援者', img: sup.profile_image || null, role: 'sup' };
    }
  } catch (e) {}
  if (!user) return;
  if (!document.getElementById('hu-style')) {
    const l = document.createElement('link');
    l.id = 'hu-style'; l.rel = 'stylesheet'; l.href = '/css/header-user.css?v=20260706';
    document.head.appendChild(l);
  }
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const roleLabel = user.role === 'org' ? '🏢 企画者' : '🤝 支援者';
  const badgeClass = user.role === 'org' ? 'hu-org' : 'hu-sup';
  const imgHtml = user.img
    ? `<img src="${esc(user.img)}" alt="" class="hu-avatar">`
    : `<span class="hu-avatar hu-avatar-emoji">${user.role === 'org' ? '🏢' : '🤝'}</span>`;
  const html = `<a href="/login.html" class="header-user" title="マイページへ">${imgHtml}<span class="hu-name">${esc(user.name)}</span><span class="hu-badge ${badgeClass}">${roleLabel}</span></a>`;
  document.querySelectorAll('.header-actions, .sp-nav-actions').forEach(el => { el.innerHTML = html; });
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
    applyHeaderUser();
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
    applyHeaderUser();
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
