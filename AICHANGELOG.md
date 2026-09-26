# AI 変更履歴 (AICHANGELOG)

## 2026-09-26: Gitリポジトリ初期化とベース.gitignoreの設定

### 概要
Gitリポジトリの初期化を行い、Tauri v2 / React / Vite / TypeScript / Cargo (Rust) 向けの `.gitignore` を作成した。

### 変更内容 (Before / After)
- **Before**: Gitリポジトリ未初期化、`.gitignore` なし。
- **After**: Gitリポジトリ初期化 (`main` ブランチ)、`.gitignore` 作成完了。

### 変更理由
`Plan.md` の Phase 1 タスク1に基づき、開発環境のバージョン管理の基盤を整えるため。

### 影響範囲
- リポジトリルートの `.git` および `.gitignore`
- 今後のビルド成果物や依存関係（`target/`, `node_modules/` 等）がGit追跡対象外となる。

## 2026-09-26: Tauri v2 (React + TypeScript) プロジェクトの生成とビルド確認

### 概要
Tauri v2 + React 19 + TypeScript + Vite プロジェクトの初期構築を行い、フロントエンド (`pnpm run build`) およびバックエンド (`cargo check` / `cargo test`) の正常終了を確認した。

### 変更内容 (Before / After)
- **Before**: Tauri / Vite / React のプロジェクト構成ファイルが存在しなかった。
- **After**:
  - `pnpm create tauri-app` を用いて React + TypeScript テンプレートを生成・配置。
  - パッケージ名・アプリケーション識別子を `typori` / `com.typori.app` に設定。
  - `pnpm install` によるフロントエンド依存関係の解決。
  - `src-tauri/src/main.rs` のライブラリ参照を `typori_lib` に更新。
  - フロントエンドビルド (`pnpm run build`) およびバックエンドビルド・テスト (`cargo check`, `cargo test`) の正常終了（Exit Code 0）を確認。

### 変更理由
`Plan.md` の Phase 1 タスク2に基づき、デスクトップアプリケーション基盤を確立するため。

### 影響範囲
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
- `src/` (Reactコンポーネント・アセット)
- `src-tauri/` (Cargo.toml, tauri.conf.json, build.rs, src/)
- `public/`, `.vscode/extensions.json`
