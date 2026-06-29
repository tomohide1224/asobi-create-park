# Jenny デザインブランチ ルール

## ブランチ名
`jenny-design`

## Jennyができること ✅
- HTML の構造・テキスト・クラス名の変更
- CSS スタイルの追加・変更
- SVG・画像ファイルの追加
- 新しい HTML ページの作成
- コピー（文言）の変更

## Jennyがやってはいけないこと ❌
以下のキーワードを含むコードを**追加しない**こと：

| 禁止パターン | 理由 |
|---|---|
| `supabase.co` | DB接続URL |
| `SUPABASE_URL` / `SUPABASE_KEY` | DB認証情報 |
| `rest/v1` | Supabase REST API |
| `functions/v1` | Supabase Edge Functions |
| `line-auth` | LINE認証エンドポイント |
| `createClient` | Supabaseクライアント初期化 |
| `sessionStorage.setItem/removeItem` | セッション管理 |

## 自動チェックの仕組み
1. `jenny-design` ブランチにpushすると GitHub Action が自動起動
2. 追加コードに禁止パターンが含まれていないかチェック
3. **クリーン** → `main` に自動マージ → Cloudflare Pages が自動デプロイ 🚀
4. **違反あり** → ブロック・エラーメッセージを表示（タクミに連絡）

## 役割分担
- **Jenny**: デザイン（HTML/CSS/UI/コピー）
- **タクミ**: DB・バックエンド・API接続・最終統合
