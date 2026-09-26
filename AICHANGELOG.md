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

## 2026-09-26: Tailwind CSS のインストールと設定、Reactコンポーネントでのスタイル適用

### 概要
Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) をインストール・設定し、グローバルCSS (`src/index.css`) の導入と `src/App.tsx` へのTailwindスタイルの適用を行った。フロントエンドビルド (`pnpm run build`) およびバックエンドビルド (`cargo check`) の正常終了を確認した。

### 変更内容 (Before / After)
- **Before**: 
  - Tailwind CSS 未導入。
  - デフォルトCSS (`src/App.css`) によるプレーンなスタイリング。
- **After**:
  - `tailwindcss` および `@tailwindcss/vite` (v4.3.3) を devDependencies に追加。
  - `vite.config.ts` に `@tailwindcss/vite` プラグインを登録。
  - `src/index.css` を作成し `@import "tailwindcss";` を定義。`src/main.tsx` でインポート。
  - レガシーな `src/App.css` を削除し、`src/App.tsx` を Tailwind CSS のユーティリティクラス（ダークモード対応、カードUI、ボタンスタイル等）でリファクタリング。
  - `pnpm run build` によるバンドル確認（Tailwind CSSのコンパイル確認）および `cargo check` がエラーなく完了（Exit Code 0）。

### 変更理由
`Plan.md` の Phase 1 タスク3に基づき、UIコンポーネントの高速なスタイリングおよびテーマ切り替えの基盤を整えるため。

### 影響範囲
- `package.json`, `pnpm-lock.yaml`, `vite.config.ts`
- `src/index.css` (新規作成), `src/main.tsx`, `src/App.tsx`, `src/App.css` (削除)

## 2026-09-26: Rust: 指定パスのテキストを読み込む open_file コマンドの実装と単体テスト

### 概要
Tauriバックエンド（Rust）において、指定されたパスのファイルをUTF-8文字列として読み込む `open_file` コマンドを実装し、ハンドラ登録および単体テスト（正常系・異常系）を追加した。

### 変更内容 (Before / After)
- **Before**: 
  - ファイル読み込み用Tauriコマンドが存在しなかった。
  - ファイルシステム操作用のモジュール `fs` が未作成。
- **After**:
  - `src-tauri/src/fs.rs` を新規作成し、`open_file(path: String) -> Result<String, String>` を実装。
  - `open_file` に対する正常系テスト（一時ファイル作成・読み込み検証・クリーンアップ）および異常系テスト（存在しないファイルパス指定時のエラー検証）を実装。
  - `src-tauri/src/lib.rs` に `pub mod fs;` を追加し、`tauri::generate_handler![greet, fs::open_file]` としてコマンドを登録。
  - `cargo test` による単体テスト通過（Exit Code 0）および `pnpm run build` の正常終了を確認。

### 変更理由
`Plan.md` の Phase 2 タスク4に基づき、フロントエンドからローカルファイルを読み込むための基盤APIを提供するため。

### 影響範囲
- `src-tauri/src/fs.rs` (新規作成)
- `src-tauri/src/lib.rs`

## 2026-09-26: Rust: 指定パスにテキストを書き込む save_file コマンドの実装と単体テスト

### 概要
Tauriバックエンド（Rust）において、指定されたパスにテキスト（UTF-8）を書き込む `save_file` コマンドを実装し、自動親ディレクトリ生成処理、ハンドラ登録、および単体テスト（新規保存・上書き保存・ネストディレクトリ生成保存）を追加した。

### 変更内容 (Before / After)
- **Before**: 
  - ファイル保存用Tauriコマンドが存在しなかった。
  - `fs.rs` には `open_file` のみ実装されていた。
- **After**:
  - `src-tauri/src/fs.rs` に `save_file(path: String, content: String) -> Result<(), String>` を実装。親ディレクトリが存在しない場合の自動作成処理 (`fs::create_dir_all`) も備える。
  - `save_file` に対する新規保存テスト (`test_save_file_success`)、上書き保存テスト (`test_save_file_overwrite`)、ネストした未作成ディレクトリを含むパスへの保存テスト (`test_save_file_creates_nested_directories`) を追加。
  - `src-tauri/src/lib.rs` の `tauri::generate_handler!` に `fs::save_file` を登録。
  - `cargo test` による全単体テスト通過（5 passed, Exit Code 0）および `pnpm run build` の正常終了を確認。

### 変更理由
`Plan.md` の Phase 2 タスク5に基づき、フロントエンドからエディタの内容をローカルファイルに書き込み・保存するためのバックエンドAPIを提供するため。

### 影響範囲
- `src-tauri/src/fs.rs`
- `src-tauri/src/lib.rs`

## 2026-09-26: Rust: 指定ディレクトリ直下のファイル/ディレクトリ一覧を返す read_dir コマンドの実装と単体テスト

### 概要
Tauriバックエンド（Rust）において、指定されたディレクトリ直下のファイルおよびディレクトリ一覧を走査して返す `read_dir` コマンドとエントリ情報構造体 `FileEntry` を実装し、ハンドラ登録および単体テスト（正常系・ディレクトリ優先昇順ソート・空ディレクトリ・存在しないパス・ファイルパス指定エラー）を追加した。

### 変更内容 (Before / After)
- **Before**: 
  - ディレクトリ一覧取得用Tauriコマンドおよび `FileEntry` 構造体が存在しなかった。
  - `fs.rs` には `open_file` と `save_file` のみ実装されていた。
- **After**:
  - `src-tauri/src/fs.rs` に `FileEntry` 構造体（`name`, `path`, `is_dir`）を定義（`Serialize`, `Deserialize` 導出）。
  - `src-tauri/src/fs.rs` に `read_dir(path: String) -> Result<Vec<FileEntry>, String>` を実装。ディレクトリを先頭に、ファイル名昇順でソートして返却。
  - `read_dir` に対するテスト（`test_read_dir_success`, `test_read_dir_empty`, `test_read_dir_not_found`, `test_read_dir_not_a_directory`）を追加。
  - `src-tauri/src/lib.rs` の `tauri::generate_handler!` に `fs::read_dir` を登録。
  - `cargo test` による全単体テスト通過（9 passed, Exit Code 0）および `pnpm run build` の正常終了を確認。

### 変更理由
`Plan.md` の Phase 2 タスク6に基づき、フロントエンド（React/サイドバー）でディレクトリツリーやファイル一覧を表示するためのバックエンドAPIを提供するため。

### 影響範囲
- `src-tauri/src/fs.rs`
- `src-tauri/src/lib.rs`

## 2026-09-26: React: Milkdownコアパッケージのインストールと、プレーンなWYSIWYGエディタコンポーネントの実装・ビルド確認

### 概要
Milkdown コアパッケージ (`@milkdown/kit`, `@milkdown/react`) をインストールし、ProseMirror ベースのプレーンな WYSIWYG エディタコンポーネント (`TyporiEditor`) の実装とタイポグラフィスタイルの整備、および `App.tsx` への組み込みを行い、フロントエンドビルド (`pnpm run build`) およびバックエンドテスト (`cargo test`) の正常終了を確認した。

### 変更内容 (Before / After)
- **Before**: 
  - Milkdown 関連ライブラリ未導入。
  - エディタコンポーネントが存在せず、`App.tsx` は greet テンプレートUIを表示していた。
- **After**:
  - `@milkdown/kit` (v7.22.2) および `@milkdown/react` (v7.22.2) を dependencies に追加。
  - `src/components/Editor/Editor.tsx` および `src/components/Editor/index.ts` を新規作成。`MilkdownProvider`, `useEditor`, `Editor.make()`, `defaultValueCtx`, `commonmark` を用いた `TyporiEditor` コンポーネントを実装。
  - `src/index.css` に `.ProseMirror` およびタイポグラフィ（見出し・段落・リスト・引用・インラインコード・コードブロック等）のスタイルを追加し、Typoraライクなドキュメント体験を実現。
  - `src/App.tsx` を更新し、ヘッダーとエディタエリアからなるミニマルなレイアウトにリファクタリング。
  - `pnpm run build` (tsc & vite build) および `cargo test` の正常終了（Exit Code 0）を確認。

### 変更理由
`Plan.md` の Phase 3 タスク7に基づき、TyporaライクなWYSIWYG Markdown編集体験のコアとなるエディタコンポーネントを導入するため。

### 影響範囲
- `package.json`, `pnpm-lock.yaml`
- `src/components/Editor/Editor.tsx` (新規作成)
- `src/components/Editor/index.ts` (新規作成)
- `src/index.css`
- `src/App.tsx`

## 2026-09-26: React: GFM（GitHub Flavored Markdown）プラグインの追加とMilkdownエディタへの適用

### 概要
Milkdown エディタに GFM プリセット (`@milkdown/kit/preset/gfm`) を追加し、テーブル、タスクリスト、打ち消し線、脚注等のレンダリングおよび ProseMirror スタイルを適用した。フロントエンドビルド (`pnpm run build`) およびバックエンドテスト (`cargo test`) の正常終了を確認した。

### 変更内容 (Before / After)
- **Before**: 
  - CommonMark 規格のみ対応（表やタスクリスト、打ち消し線等の GFM 拡張記法が未対応）。
  - `src/index.css` にテーブルやタスクリスト、打ち消し線等のスタイルが未定義。
- **After**:
  - `src/components/Editor/Editor.tsx` にて `gfm` プリセットを Milkdown インスタンスに登録（`.use(gfm)`）。
  - デフォルトサンプルテキストにタスクリスト、テーブル、打ち消し線の記法を追加。
  - `src/index.css` に GFM 要素（テーブルのボーダー/セル選択/リサイズハンドル、チェックボックス付きタスクリスト、取り消し線、脚注など）のタイポグラフィスタイルを追加。
  - `pnpm run build` (tsc & vite build) および `cargo test` の正常終了（Exit Code 0）を確認。

### 変更理由
`Plan.md` の Phase 3 タスク8に基づき、Typora のような実用的な Markdown 編集において不可欠な GFM 拡張機能（テーブル、タスクリスト等）をエディタでシームレスに利用可能にするため。

### 影響範囲
- `src/components/Editor/Editor.tsx`
- `src/index.css`





