# AGENTS.md

## 1. プロジェクト概要 & 技術スタック
- Application Type: Local Markdown Editor (GUI)
- Core/Backend: Rust
- Framework: Tauri
- Frontend: React + TypeScript
- Editor Core: Milkdown (WYSIWYG-like Markdown Editor)
- Styling: Tailwind CSS
- Package Manager: pnpm (Frontend), cargo (Backend)

## 2. 検証コマンド (Verification Ground Truth)
エージェントはコード修正後、以下のコマンドを実行して正常終了（Exit Code 0）を確認すること。
- バックエンド (Rust): `cargo check` または `cargo test`
- フロントエンド (React/TS): `pnpm run lint` または `pnpm run build`
- 全体起動テスト: `pnpm tauri dev` (※ 対話的確認が必要なため、CI的チェックの場合は `cargo clippy` 等で代替)

## 3. 参照ディレクトリ
- 仕様書正本: `for_agent/` 配下のすべての .md ファイル
- 進捗管理: `Plan.md`
- 変更ログ: `AICHANGELOG.md`
