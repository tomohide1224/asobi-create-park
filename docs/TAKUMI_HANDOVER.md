# タクミ引き継ぎメモ（2026-07-01）

## プロジェクト概要
- サイト: https://asobi-create-park.pages.dev
- GitHub: https://github.com/tomohide1224/asobi-create-park
- ホスティング: Cloudflare Pages（mainブランチへのpushで自動デプロイ）
- DB: Supabase（プロジェクトID: hlgbazcqekvjukbjtskt）

## セキュリティ情報（絶対チャットに貼らない）
- Supabase ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ2JhemNxZWt2anVrYmp0c2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgxMzksImV4cCI6MjA5NzkwNDEzOX0.QwXexU1f4vjeXrVsGU3ayZsW9gLj7XIcbqkHSlAsEm8
- JENNY_API_KEY: c454a0c9e7452e829261bdff7617a493b2637f9d12eaaca3adccdb9782e4244d
- GitHub PAT: ~/Desktop/asobi-create-park/.github-token に保存済み（gitignore済み）

## 新しい作業フロー（重要！）
前セッションまでの遅い方法（GitHub API経由）をやめて、ローカルファイル直接編集に切り替えた。

### タクミがやること
1. `Read` でローカルファイルを読む（/Users/tomohide/Desktop/asobi-create-park/xxx.html）
2. `Edit` で変更箇所だけ書き換え（差分のみ、爆速）
3. bashでgit push（設定済みなら自動、未設定ならひでっちにpushしてもらう）

### git push自動化の状態
- GitHub CLI（gh）インストール済み ✅
- `gh auth login` 完了済み ✅
- `.github-token` ファイル作成済み（~/Desktop/asobi-create-park/.github-token）✅
- `.gitignore` に .github-token 追記済み ✅
- Claudeの設定：ネットワーク外部通信ON、github.com追加済み ✅
- **ただし新しいチャットセッションでないとgit pushが効かない**（設定変更が現セッションに未反映）

### bashでgit pushするときの手順（新セッション冒頭に毎回実行）
```bash
TOKEN=$(cat /sessions/xxx/mnt/asobi-create-park/.github-token)
git config --global user.email "tomo791224@gmail.com"
git config --global user.name "tomohide1224"
git config --global credential.helper store
echo "https://tomohide1224:${TOKEN}@github.com" > ~/.git-credentials
```
※ /sessions/xxx は実際のセッションパスに合わせる
※ ローカルパスは /sessions/fervent-gallant-lovelace/mnt/asobi-create-park/

## ロゴ統一作業（Task #15）の状態

### 完了済み ✅
- index.html
- supporter.html
- plans-manage.html
- textbooks.html
- login.html（ロゴサイズも56pxに調整済み）
- cases.html
- about.html
- faq.html
- events.html

### 新ロゴの共通パターン
```html
<a class="logo" href="index.html">
  <img src="assets/ACP-logo.jpg" alt="ASOBI CREATE PARK やりたいを、カタチに。" style="height:40px;width:auto;display:block;">
</a>
```
※ login.htmlだけ height:56px（ナビなしページのため大きめ）

### 全ファイル完了 ✅
concept.html / safety.html / guidelines.html も対応済み。旧ロゴ残りゼロ確認済み。

## 残りのTODO
1. **ロゴ統一の残りファイル確認・修正**（concept/safety/guidelinesなど）
2. **jenny-api-key.txtの削除**（セキュリティ必須）
3. **jenny-memory Edge Functionの削除**（不要・jenny-gatewayで代替済み）
4. **jenny-designブランチをmainと同期**
5. **ASSETS.mdへの追記**（SVG禁止ルール、権限ルール）

## ロゴが未対応かどうかの確認方法
```bash
grep -l "logo-icon\|logo-text\|asobi-create-park-logo" /sessions/fervent-gallant-lovelace/mnt/asobi-create-park/*.html
```
これで旧ロゴが残っているファイルが一覧表示される。
