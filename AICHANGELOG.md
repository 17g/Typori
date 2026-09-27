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

## 2026-09-26: React: サイドバーの基本UIコンポーネント実装（Tailwind CSS利用）とビルド確認

### 概要
Tailwind CSS を用いたサイドバーコンポーネント（`Sidebar`、`SidebarItem`、型定義 `FileEntry` / `SidebarProps`）を実装し、エディタとの左右分割レイアウトを `App.tsx` に統合した。サイドバーの展開/折りたたみ、ファイル/フォルダのアイコン表示、選択中アイテムのハイライトに対応し、フロントエンドビルド (`pnpm run build`) およびバックエンドチェック/テスト (`cargo check`, `cargo test`) の正常終了を確認した。

### 変更内容 (Before / After)
- **Before**: 
  - `src/components/Sidebar/` は未作成で、サイドバーUIが存在せず、画面全体にエディタのみが表示されていた。
- **After**:
  - `src/components/Sidebar/types.ts` を作成し、Rust 側の `FileEntry` 構造体と互換性のあるファイル/ディレクトリエントリ型およびコンポーネント Props を定義。
  - `src/components/Sidebar/SidebarItem.tsx` を作成し、ディレクトリと各種ファイル（Markdown / テキスト / 一般ファイル）に応じたアイコン、選択状態、ホバー効果を実装。
  - `src/components/Sidebar/Sidebar.tsx` を作成し、エクスプローラーヘッダー、カレントディレクトリ表示、展開/折りたたみトグルボタン、ファイル一覧スクロール領域、空状態表示、フッターを構築。
  - `src/components/Sidebar/index.ts` からコンポーネントと型をエクスポート。
  - `src/App.tsx` に `Sidebar` を配置し、ヘッダーのトグルボタンおよびサイドバー内の開閉ボタンで開閉可能にし、左右分割レイアウトを整備。
  - `pnpm run build`、`cargo check`、`cargo test` が Exit Code 0 で正常終了することを確認。

### 変更理由
`Plan.md` の Phase 4 タスク9「React: サイドバーの基本UIコンポーネント実装（Tailwind CSS利用）とビルド確認」に基づき、次ステップで実装する Tauri IPC (`read_dir`) 連携に先立ち、ディレクトリツリーやファイルを表示・選択するための基盤UIコンポーネントを整備するため。

### 影響範囲
- `src/components/Sidebar/types.ts` (新規作成)
- `src/components/Sidebar/SidebarItem.tsx` (新規作成)
- `src/components/Sidebar/Sidebar.tsx` (新規作成)
- `src/components/Sidebar/index.ts` (新規作成)
- `src/App.tsx`

## 2026-09-26: 結合: Rustの read_dir を呼び出し、サイドバーにディレクトリ一覧を表示する機能の実装

### 概要
Tauri の `read_dir` コマンドを呼び出す API モジュール (`src/api/fs.ts`) を新設し、サイドバーと結合して実ディレクトリのツリー表示・オンデマンド階層展開・親ディレクトリへの移動・フォルダパス指定オープン・更新機能を実装した。併せて Rust バックエンドにカレントディレクトリ取得 (`get_current_dir`) および親ディレクトリ取得 (`get_parent_dir`) コマンドと単体テストを追加した。

### 変更内容 (Before / After)
- **Before**: 
  - `src/App.tsx` 内でハードコードされたモック用ファイル一覧（`initialSampleEntries`）を表示していた。
  - サブディレクトリの階層展開や親ディレクトリ移動、フォルダ変更操作が未対応だった。
  - Tauri IPC 呼び出し用の共通 API モジュールが存在しなかった。
- **After**:
  - `src/api/fs.ts` を作成し、Tauri コマンド（`read_dir`, `get_current_dir`, `get_parent_dir`, `open_file`, `save_file`）の型付き呼び出し関数を定義。
  - `src-tauri/src/fs.rs` に `get_current_dir` と `get_parent_dir` コマンドを追加し、単体テスト（`test_get_current_dir`, `test_get_parent_dir`）を実装（計11テストすべてパス）。
  - `src-tauri/src/lib.rs` の `tauri::generate_handler!` に `fs::get_current_dir` と `fs::get_parent_dir` を登録。
  - `src/components/Sidebar/` の各コンポーネント（`Sidebar`, `SidebarItem`, `types.ts`）を拡張し、ディレクトリの再帰的ツリー表示、ローディング表示、エラーハンドリング、親ディレクトリ移動、フォルダパス入力による切り替え、最新化（リフレッシュ）に対応。
  - `src/App.tsx` で初期起動時に `getCurrentDir()` を呼び出し、`readDir` でカレントディレクトリのファイル一覧を取得してサイドバーに動的レンダリング。
  - `cargo test` (11 passed)、`cargo check`、`pnpm run build` がすべて Exit Code 0 で完了することを確認。

### 変更理由
`Plan.md` の Phase 4 タスク10「結合: Rustの read_dir を呼び出し、サイドバーにディレクトリ一覧を表示する機能の実装」に基づき、実ファイルシステムとフロントエンドUIを接続して、ローカルファイルの走査・ツリー探索を行えるようにするため。

### 影響範囲
- `src-tauri/src/fs.rs`
- `src-tauri/src/lib.rs`
- `src/api/fs.ts` (新規作成)
- `src/components/Sidebar/types.ts`
- `src/components/Sidebar/SidebarItem.tsx`
- `src/components/Sidebar/Sidebar.tsx`
- `src/App.tsx`

## 2026-09-26: 結合: サイドバーのファイルクリック時に open_file を呼び出し、Milkdownエディタに内容を表示する機能の実装

### 概要
サイドバーでファイルをクリックした際に、Tauri の `open_file` コマンドを通じてファイル内容（Markdownテキスト）を非同期取得し、Milkdown エディタに動的ロードして表示する機能を実装した。併せて読み込み中インジケータ、エラー表示・再試行機能、ヘッダーへのファイル名表示、エディタ変更検知リスナーを追加した。

### 変更内容 (Before / After)
- **Before**:
  - サイドバーでファイルをクリックしても、選択パス状態（`selectedPath`）が更新されるのみでファイル内容は読み込まれず、Milkdown エディタには固定の初期サンプルテキスト（「ようこそ Typori へ」）が表示され続けていた。
  - `TyporiEditor` は動的なコンテンツ更新や外部からのファイル読み込み、内容変更リスナーに対応していなかった。
- **After**:
  - `src/components/Editor/Editor.tsx` を改訂：
    - `content`, `filePath`, `onChange` props を追加。
    - `useInstance` および `replaceAll` マクロにより、外部からのコンテンツ更新（動的ロード）に対応。
    - `@milkdown/kit/plugin/listener` を導入し、`markdownUpdated` による編集検知コールバック（`onChange`）を連携。
  - `src/App.tsx` を改訂：
    - `openFile` API をインポートし、`handleSelectFile` 内で非同期に `open_file` を呼び出してファイル内容を取得。
    - ファイル読み込み状態（`fileContent`, `isFileLoading`, `fileError`）を管理。
    - 読み込み中のスピナー表示および読み込み失敗時のエラーカード・再試行ボタンを実装。
    - ヘッダー部分に現在開いているファイル名を表示するバッジを追加。
    - ファイル切り替え時に `key={selectedPath ?? "__welcome__"}` を付与することで、エディタインスタンスおよび履歴のクリーンな再生成を実現。
  - `cargo test` (11 passed)、`cargo check`、`pnpm run build` がすべてエラーなく（Exit Code 0）成功することを確認。

### 変更理由
`Plan.md` の Phase 4 タスク11「結合: サイドバーのファイルクリック時に open_file を呼び出し、Milkdownエディタに内容を表示する機能の実装」に基づき、ユーザーがサイドバーからMarkdownファイルを選択してエディタ上で閲覧・編集できるようにするため。

### 影響範囲
- `src/components/Editor/Editor.tsx`
- `src/App.tsx`


## 2026-09-26: 結合: エディタ内容の変更を検知し、ショートカット（Ctrl+S / Cmd+S）で save_file を呼び出す保存機能の実装

### 概要
Milkdown エディタでのテキスト変更を検知し、未保存状態（ダーティ状態）のトラッキング、ショートカットキー（`Ctrl+S` / `Cmd+S`）および保存ボタンによる Tauri の `save_file` コマンド呼び出し、保存中・完了・エラーのフィードバックUI、未保存時のファイル切り替え・ページ離脱防止機能を実装した。

### 変更内容 (Before / After)
- **Before**:
  - エディタでテキストを編集してもディスク上のファイルへの保存機能（`save_file`）が連携されておらず、ショートカット（`Ctrl+S` / `Cmd+S`）を押すとブラウザ標準のWebページ保存ダイアログが作動していた。
  - 未保存状態の視覚的表示がなく、ファイルを切り替えた際に変更が警告なしで破棄されていた。
- **After**:
  - `src/components/Editor/Editor.tsx`:
    - `listenerCtx.markdownUpdated` 内で `prevContentRef.current` を更新し、タイピングによるステート更新時の不要な `replaceAll` 実行およびカーソル飛びを防止。
  - `src/App.tsx`:
    - `saveFile` API をインポートし、保存状態管理用のステート（`savedContent`, `isSaving`, `saveStatus`, `saveError`）を追加。
    - `isDirty`（ファイル内容と保存済み内容の差分検知）を実装。
    - `handleSave` を実装し、非同期で `save_file` を呼び出してファイル書き込みを行い、成功時に `savedContent` を同期、ステータス表示（「保存中...」「保存完了」「保存失敗」）を管理。
    - `keydown` イベントリスナーにより `Ctrl+S` / `Cmd+S` をフックしてデフォルト動作を防止し、`handleSave` を安全にトリガー。
    - 未保存状態で別ファイルを開こうとした場合の確認ダイアログ（`window.confirm`）およびウィンドウ離脱防止（`beforeunload`）を実装。
    - ヘッダーに未保存インジケータ（オレンジ丸マーク）、保存状態・ショートカット案内付きの保存ボタン、保存失敗時のエラー通知バーを追加。
  - `pnpm run build` および `cargo test` (11 passed) がすべて正常終了（Exit Code 0）することを確認。

### 変更理由
`Plan.md` の Phase 4 タスク12「結合: エディタ内容の変更を検知し、ショートカット（Ctrl+S / Cmd+S）で save_file を呼び出す保存機能の実装」に基づき、ユーザーが編集したドキュメントを安全かつ快適にディスクへ保存できるようにするため。

### 影響範囲
- `src/components/Editor/Editor.tsx`
- `src/App.tsx`

## 2026-09-26: UI調整: Typoraライクなヘッダーレス・ミニマルレイアウトへのリファクタリング（サイドバーのトグル開閉など）

### 概要
Typoraライクなミニマルな執筆体験を実現するため、従来の太い固定ヘッダーバーを廃止し、背景と一体化したスリークなミニマルトップバーへと刷新した。サイドバーの完全な収納・スライド開閉（幅0とトランジションアニメーション）およびショートカットキー（`Ctrl+\` / `Cmd+\`）に対応し、画面下部に文字数・単語数・保存状態を表示するTyporaライクなステータスバーを新設した。併せて細身のミニマルスクロールバースタイルを導入した。

### 変更内容 (Before / After)
- **Before**:
  - `h-10 border-b` の固定ヘッダーが存在し、エディタ画面が分断されていた。
  - サイドバーを折りたたんだ際も `w-10`（40px）のダミー縦バーが画面左端に常時残り、エディタを全画面幅で利用できなかった。
  - サイドバー開閉のためのキーボードショートカットが存在しなかった。
  - ドキュメントの文字数や単語数を把握する手段がなかった。
- **After**:
  - `src/components/Sidebar/Sidebar.tsx`:
    - `isOpen` が false の時に幅0（`w-0 border-r-0 opacity-0 pointer-events-none`）となり、開閉時に `transition-[width,opacity]` による滑らかなスライドイン/アウトを実現。
    - ツールチップにショートカット案内 `(Ctrl+\)` を追加。
  - `src/App.tsx`:
    - 上部ヘッダーを境界線の目立たないミニマルトップバー（`h-9 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs`）へと刷新。
    - 左側にサイドバートグルボタンとTyporiロゴ、中央にファイル名と未保存インジケータ（`●`）、右側にミニマルな保存コントロールをすっきり配置。
    - キーボードショートカット `Ctrl+\` / `Cmd+\` によるサイドバートグル操作を追加。
    - 画面下部にTyporaライクな極小ステータスバー（フォルダ名、単語数、文字数、保存状態ドット）を追加。
  - `src/index.css`:
    - 洗練された細身のミニマルスクロールバー（WebKit scrollbar）スタイルを追加。
  - `pnpm run build` および `cargo test` (11 passed) がすべて正常終了（Exit Code 0）することを確認。

### 変更理由
`Plan.md` の Phase 5 タスク13「UI調整: Typoraライクなヘッダーレス・ミニマルレイアウトへのリファクタリング（サイドバーのトグル開閉など）」に基づき、不要なUIノイズを排除し、Typoraのようにドキュメント執筆に集中できる洗練されたミニマルレイアウトを提供するため。

### 影響範囲
- `src/components/Sidebar/Sidebar.tsx`
- `src/App.tsx`
- `src/index.css`

## 2026-09-27: 新規ファイル作成機能: サイドバーから新規Markdownファイルを作成するUIとバックエンド処理の追加

### 概要
サイドバーから直接新規Markdownファイル（`.md`）を作成できる機能を実装した。Rust バックエンドに `create_file` コマンドおよび自動親ディレクトリ生成・既存ファイル重複防止チェック・単体テスト（正常系・重複エラー・親ディレクトリ自動生成）を追加し、フロントエンドに新規ファイル作成ボタン、インラインファイル名入力フォーム（キーボード操作対応）、および作成直後の自動オープン処理を統合した。

### 変更内容 (Before / After)
- **Before**:
  - サイドバーから新しいファイルを作成する手段がなく、既存のファイルを開いて保存することしかできなかった。
  - バックエンドには `open_file` と `save_file` のみ存在し、意図しない上書きを防止しながら安全に新規作成する専用APIがなかった。
- **After**:
  - `src-tauri/src/fs.rs`:
    - `create_file(path: String, initial_content: Option<String>) -> Result<FileEntry, String>` コマンドを実装。既存ファイルがある場合は上書きせずエラーを返し、安全に新規作成を行う。
    - 単体テスト（`test_create_file_success`, `test_create_file_already_exists`, `test_create_file_creates_parent_dirs`）を追加（計14テストすべてパス）。
  - `src-tauri/src/lib.rs`:
    - `tauri::generate_handler!` に `fs::create_file` を登録。
  - `src/api/fs.ts`:
    - `createFile(path: string, initialContent?: string): Promise<FileEntry>` を追加。
  - `src/components/Sidebar/types.ts`:
    - `SidebarProps` に `onCreateFile?: (fileName: string) => Promise<boolean | void>;` を追加。
  - `src/components/Sidebar/Sidebar.tsx`:
    - サイドバーヘッダーのツールバーに「新規ファイル作成」ボタン（プラスアイコン `+`）を追加。
    - クリック時にインライン入力フォームを展開し、ファイル名（デフォルト: `Untitled.md`）の入力・自動 `.md` 拡張子補完・作成中スピナー・エラー表示・Escapeキーでのキャンセルに対応。
  - `src/App.tsx`:
    - `handleCreateFile` コールバックを実装。
    - 未保存の変更がある場合の確認ダイアログ、カレントディレクトリ基準の安全なパス解決、見出し入りの初期コンテンツ生成、ファイル作成後のツリー即時再読み込みおよびエディタへの自動ロード・フォーカス切り替えを実現。
  - `cargo test` (14 passed) および `pnpm run build` がすべて正常終了（Exit Code 0）することを確認。

### 変更理由
`Plan.md` の Phase 5 タスク14「新規ファイル作成機能: サイドバーから新規Markdownファイルを作成するUIとバックエンド処理の追加」に基づき、ユーザーがアプリ内からワンクリックで新しいMarkdownドキュメントを作成し、即座に執筆を開始できるようにするため。

### 影響範囲
- `src-tauri/src/fs.rs`
- `src-tauri/src/lib.rs`
- `src/api/fs.ts`
- `src/components/Sidebar/types.ts`
- `src/components/Sidebar/Sidebar.tsx`
- `src/App.tsx`

## 2026-09-27: テーマ機能: Tailwind CSS を活用したライト/ダークテーマの切り替え機能の実装

### 概要
Tailwind CSS v4 の `@custom-variant dark (&:where(.dark, .dark *));` を設定し、ライト / ダーク / システム連動のテーマ切り替え機能（`useTheme` フックおよび `ThemeToggle` コンポーネント）を実装した。ユーザーの選択は `localStorage` に保存され、エディタ本体やサイドバー・トップバー等の全UI要素がシームレスにテーマ切り替えに対応する。

### 変更内容 (Before / After)
- **Before**:
  - テーマの切り替え機能がなく、UI全体が静的なスタイルまたはOSの設定依存に留まっていた。
  - Tailwind v4 のクラスベースのダークモードバリアント（`.dark` クラス）が未設定だったため、ユーザーの手動切り替えに対応していなかった。
- **After**:
  - `src/index.css`:
    - `@custom-variant dark (&:where(.dark, .dark *));` を追加し、HTML要素の `.dark` クラスに基づくスタイル適用を有効化。
    - 見出し（h1, h2）、コードブロック（code, pre）、水平線（hr）、テーブル（table, th, td）のダークモード用スタイリングを洗練。
  - `src/hooks/useTheme.ts`:
    - テーマ状態（`light` | `dark` | `system`）の管理、`localStorage`（キー: `typori-theme`）への永続化、OS設定（`prefers-color-scheme: dark`）への自動追従、HTML要素への `.dark` クラス付与を行うカスタムフックを実装。
  - `src/components/ThemeToggle/`:
    - テーマ切り替え用のドロップダウン/トグルコンポーネント（`ThemeToggle.tsx`）を作成。ライト、ダーク、システム連動の各モードをアイコン付きで選択可能にし、外側クリック・Escキーでのクローズに対応。
  - `src/App.tsx`:
    - `useTheme` フックを統合し、トップバーの右側に `ThemeToggle` ボタンを配置。
  - `for_agent/architecture.md`:
    - テーマ機能の要件および改訂履歴を追記。
  - バックエンドテスト（`cargo test` in `src-tauri`、14 passed）およびフロントエンドビルド（`pnpm run build`）がエラーなく完了（Exit Code 0）。

### 変更理由
`Plan.md` の Phase 5 タスク15「テーマ機能: Tailwind CSS を活用したライト/ダークテーマの切り替え機能の実装」に基づき、ユーザーの作業環境や好みに応じてライトテーマとダークテーマを柔軟に切り替えられるようにするため。

### 影響範囲
- `src/index.css`
- `src/hooks/useTheme.ts`
- `src/components/ThemeToggle/ThemeToggle.tsx`
- `src/components/ThemeToggle/index.ts`
- `src/App.tsx`
- `for_agent/architecture.md`
- `Plan.md`
- `AICHANGELOG.md`






