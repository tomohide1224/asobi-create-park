# ASOBI CREATE PARK — システム構成設計書

作成日：2026-07-01

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| サイト | https://asobi-create-park.pages.dev |
| ホスティング | Cloudflare Pages（mainブランチ自動デプロイ） |
| DB | Supabase（プロジェクトID: hlgbazcqekvjukbjtskt） |
| 認証 | LINE Login |
| AI連携 | Jenny（Supabase Edge Function経由） |

---

## 2. 現状の課題

- ヘッダー・フッターのHTMLが全ページにコピペされている
- CSS・JSがHTMLファイル内にべた書きされている
- 共通処理（Supabase接続、認証チェック等）が各ページに重複している
- 新ページ追加のテンプレートがなく、品質がバラバラになりやすい

---

## 3. 理想のフォルダ構成

```
asobi-create-park/
│
├── index.html              # トップページ
├── events.html             # イベント一覧
├── cases.html              # 事例
├── about.html              # サイトについて
├── faq.html                # よくある質問
├── concept.html            # コンセプト
├── safety.html             # 安心・安全
├── guidelines.html         # 掲載ガイドライン
├── login.html              # ログイン（グロナビなし）
├── supporter.html          # 支援者
├── plans-manage.html       # 企画管理
├── textbooks.html          # 教科書
├── messages.html           # メッセージ
├── applicants.html         # 申込者
│
├── components/             # 共通パーツ
│   ├── header.html         # グロナビ付きヘッダー
│   ├── header-simple.html  # ロゴのみヘッダー（login等）
│   └── footer.html         # フッター
│
├── css/
│   ├── common.css          # 全ページ共通スタイル（変数・リセット・ヘッダー・フッター）
│   ├── components.css      # ボタン・カード等の共通UIパーツ
│   └── pages/
│       ├── index.css       # トップページ固有
│       ├── events.css      # イベント一覧固有
│       └── ...             # 各ページ固有スタイル
│
├── js/
│   ├── common.js           # 共通処理（コンポーネント読み込み等）
│   ├── api.js              # Supabase接続・共通APIラッパー
│   ├── auth.js             # 認証チェック・LINE Login
│   ├── utils.js            # 汎用ユーティリティ
│   └── pages/
│       ├── events.js       # イベント一覧ページロジック
│       ├── login.js        # ログインページロジック
│       └── ...             # 各ページ固有ロジック
│
├── assets/                 # 画像・アイコン等
│   ├── ACP-logo.jpg
│   ├── hero-image.png
│   └── ...
│
├── favicon.svg             # ファビコン（ルート必須）
│
├── docs/                   # 開発者向けドキュメント
│   ├── SYSTEM_DESIGN.md    # 本ファイル
│   ├── ASSETS.md           # アセット管理ルール
│   └── TAKUMI_HANDOVER.md  # AI引き継ぎメモ
│
└── .github/                # GitHub Actions
```

---

## 4. 共通コンポーネント設計

### ヘッダー種別

| 種別 | 使用ページ | 特徴 |
|---|---|---|
| `header.html` | 一般公開ページ全般 | グロナビ＋ログインボタン付き |
| `header-simple.html` | login.html | ロゴのみ、ナビなし |
| `header-admin.html` | plans-manage, applicants等 | 「管理画面に戻る」リンク付き |

### コンポーネント読み込み方式

```html
<!-- 各HTMLページのヘッダー位置に記述 -->
<div id="site-header"></div>

<!-- ページ末尾で読み込み -->
<script src="js/common.js"></script>
```

```javascript
// js/common.js
async function loadComponent(id, path) {
  const res = await fetch(path);
  const html = await res.text();
  document.getElementById(id).innerHTML = html;
}

loadComponent('site-header', '/components/header.html');
loadComponent('site-footer', '/components/footer.html');
```

---

## 5. JS設計方針

### api.js — Supabase共通ラッパー

```javascript
// 接続情報は1箇所だけ
const SUPABASE_URL = 'https://hlgbazcqekvjukbjtskt.supabase.co';
const SUPABASE_ANON_KEY = '...';

async function supabaseGet(table, query = '') { ... }
async function supabasePost(table, data) { ... }
async function supabaseUpdate(table, id, data) { ... }
```

### auth.js — 認証チェック

```javascript
// 認証が必要なページの冒頭で呼ぶだけ
requireAuth();  // 未ログインならlogin.htmlへリダイレクト
getCurrentUser(); // 現在のユーザー情報を返す
```

### pages/ — ページ固有ロジック

- 各ページのHTMLは `<script src="js/pages/xxx.js">` だけ読み込む
- ページ固有の処理は pages/ 以下に閉じ込める

---

## 6. CSS設計方針

### common.css に定義するもの

```css
/* カラー変数（全ページ共通） */
:root {
  --orange: #FF6B35;
  --green: #2D9E6B;
  --navy: #1A1A2E;
  --gray: #6C757D;
  --light: #F8F9FA;
}

/* リセット・ベーススタイル */
/* ヘッダー・フッタースタイル */
/* レスポンシブブレークポイント定義 */
```

### ページ固有CSSの方針

- 共通変数（`--orange`等）を使う
- コンポーネントCSSを上書きしない
- ページ固有スタイルは `css/pages/xxx.css` に閉じ込める

---

## 7. エラーハンドリング設計

### 7-1. API通信エラー（Supabase接続失敗・タイムアウト）

```javascript
// js/api.js 内で統一処理
async function supabaseGet(table, query = '') {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { ... });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) handleApiError(e);
    else handleNetworkError(e); // タイムアウト・オフライン
  }
}

// エラー種別
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function handleApiError(e) {
  if (e.status === 401) redirectToLogin();       // 認証切れ
  if (e.status === 403) showError('権限がありません');
  if (e.status === 404) showError('データが見つかりません');
  if (e.status >= 500) showError('サーバーエラーが発生しました。時間をおいて再試行してください。');
}

function handleNetworkError(e) {
  showError('通信エラーが発生しました。インターネット接続を確認してください。');
  console.error('[NetworkError]', e);
}
```

### 7-2. 認証エラー（セッション切れ・権限なし）

```javascript
// js/auth.js
function requireAuth() {
  const user = getSessionUser();
  if (!user) {
    // セッション切れ → ログインページへ（元のURLをパラメータで渡す）
    window.location.href = `/login.html?redirect=${encodeURIComponent(location.pathname)}`;
    return;
  }
  return user;
}

function requireRole(role) {
  const user = requireAuth();
  if (!user) return;
  if (user.role !== role) {
    showError('このページにアクセスする権限がありません');
    setTimeout(() => location.href = '/index.html', 2000);
  }
}
```

| エラー種別 | 対応 |
|---|---|
| 未ログイン | login.htmlへリダイレクト（元URLを保持） |
| セッション切れ | 同上 |
| 権限不足 | エラーメッセージ表示 → トップへリダイレクト |
| アカウント停止 | 専用メッセージ表示 |

### 7-3. ユーザー操作エラー（入力バリデーション）

```javascript
// js/utils.js
function validateForm(fields) {
  const errors = {};
  fields.forEach(({ name, value, rules }) => {
    if (rules.required && !value.trim()) errors[name] = '必須項目です';
    if (rules.maxLength && value.length > rules.maxLength)
      errors[name] = `${rules.maxLength}文字以内で入力してください`;
    if (rules.pattern && !rules.pattern.test(value))
      errors[name] = rules.message || '入力形式が正しくありません';
  });
  return errors;
}

function showFieldErrors(errors) {
  // 各フィールドの下にエラーメッセージを表示
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
```

**バリデーションルール**

| チェック | タイミング |
|---|---|
| 必須チェック | フォーム送信時 |
| 文字数チェック | フォーム送信時 |
| 形式チェック（メール等） | フォーム送信時 |
| リアルタイムチェック | 原則行わない（UX優先） |

### 7-4. 表示エラー（データ取得失敗時のUI）

```javascript
// js/utils.js
function showLoadingState(container) {
  container.innerHTML = '<div class="loading">読み込み中...</div>';
}

function showEmptyState(container, message = 'データがありません') {
  container.innerHTML = `<div class="empty-state">${message}</div>`;
}

function showErrorState(container, message = 'データの取得に失敗しました') {
  container.innerHTML = `
    <div class="error-state">
      <p>${message}</p>
      <button onclick="location.reload()">再読み込み</button>
    </div>
  `;
}
```

**状態の種類と表示**

| 状態 | 表示内容 |
|---|---|
| 読み込み中 | スピナー or スケルトン |
| データなし | 「まだ登録がありません」等の案内 |
| 取得失敗 | エラーメッセージ＋再読み込みボタン |
| 送信成功 | 成功トースト（3秒で消える） |
| 送信失敗 | エラートースト＋詳細メッセージ |

### 7-5. エラーログ方針

- `console.error` はすべてのエラーで必ず出力（開発時のデバッグ用）
- ユーザーには技術的詳細を見せない（「エラーコード: 500」等はNG）
- 本番環境では将来的にエラーログをSupabaseまたは外部サービスへ送信

---

## 8. 移行ロードマップ

| フェーズ | 内容 | 優先度 |
|---|---|---|
| Phase 1 | フォルダ構成を整える（css/, js/, components/ 作成） | 高 |
| Phase 2 | header/footer を components/ に外出し | 高 |
| Phase 3 | common.css / api.js / auth.js を作成・共通化 | 高 |
| Phase 4 | 各ページのインラインCSS・JSを pages/ に移行 | 中 |
| Phase 5 | 新ページ追加テンプレートを整備 | 中 |

---

## 8. 新ページ追加時のルール（暫定）

1. `components/header.html` を読み込む（loginページ以外）
2. CSS は `css/common.css` + `css/pages/xxx.css` に分離
3. JS は `js/api.js` `js/auth.js` を読み込み、固有処理は `js/pages/xxx.js` に書く
4. Supabase接続情報は `api.js` 以外に書かない
5. インラインスタイル（style属性）は原則禁止

---

*このドキュメントはシステム構成が変わるたびに更新すること*
