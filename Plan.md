# 開発計画 (Plan)

本計画は `for_agent/architecture.md` の仕様に基づき、エージェントが自律的に1イテレーションで1タスクを実装・検証（Exit Code 0）できる最小粒度に分解したものです。

---

## Phase 1: プロジェクトの初期化と基盤構築
- [x] 1. Gitリポジトリ初期化とベースとなる `.gitignore` の設定
- [x] 2. Tauri v2 (React + TypeScript) プロジェクトの生成（`pnpm create tauri-app`）とビルド確認 (`pnpm run build` / `cargo check`)
- [x] 3. Tailwind CSS のインストールと設定、および React コンポーネントでのスタイル適用とビルド確認

## Phase 2: バックエンド (Rust) - ファイルシステム API 実装
- [x] 4. Rust: 指定パスのテキストを読み込む `open_file` コマンドの実装と単体テスト（`cargo test`）
- [x] 5. Rust: 指定パスにテキストを書き込む `save_file` コマンドの実装と単体テスト（`cargo test`）
- [x] 6. Rust: 指定ディレクトリ直下のファイル/ディレクトリ一覧を返す `read_dir` コマンドの実装と単体テスト（`cargo test`）

## Phase 3: フロントエンド (React) - エディタコア実装
- [x] 7. React: Milkdownコアパッケージのインストールと、プレーンなWYSIWYGエディタコンポーネントの実装・ビルド確認
- [x] 8. React: GFM（GitHub Flavored Markdown）プラグインの追加と、Milkdownエディタへの適用確認

## Phase 4: フロントエンド (React) - UIと状態管理
- [x] 9. React: サイドバーの基本UIコンポーネント実装（Tailwind CSS利用）とビルド確認
- [x] 10. 結合: Rustの `read_dir` を呼び出し、サイドバーにディレクトリ一覧を表示する機能の実装
- [x] 11. 結合: サイドバーのファイルクリック時に `open_file` を呼び出し、Milkdownエディタに内容を表示する機能の実装
- [x] 12. 結合: エディタ内容の変更を検知し、ショートカット（Ctrl+S / Cmd+S）で `save_file` を呼び出す保存機能の実装

## Phase 5: UI/UXのブラッシュアップと機能拡張
- [x] 13. UI調整: Typoraライクなヘッダーレス・ミニマルレイアウトへのリファクタリング（サイドバーのトグル開閉など）
- [x] 14. 新規ファイル作成機能: サイドバーから新規Markdownファイルを作成するUIとバックエンド処理の追加
- [x] 15. テーマ機能: Tailwind CSS を活用したライト/ダークテーマの切り替え機能の実装
- [x] 16. OS連携: Tauriの機能を用いたOSネイティブメニューの構築（保存、新規作成など）

## Phase 6: リリース準備
- [x] 17. 最終ビルド確認とインストーラの作成 (`pnpm tauri build`)

## Phase 7: エディタ機能の拡張 (WYSIWYG, Undo/Redo)
- [x] 18. エディタ: Undo/Redo機能の実装（Milkdown history plugin の追加）と Ctrl+Z/Ctrl+Y 確認
- [x] 19. エディタ: リンク・引用の視覚的編集サポートの組み込みと動作確認
- [x] 20. エディタ: 表（テーブル）の作成・視覚的な編集とサイズ変更機能の実装
- [x] 21. エディタ: D&Dによる画像ファイルの挿入と保存処理・表示ロジックの実装

## Phase 8: ソースコード編集とフォーカスモード
- [x] 22. エディタ: Markdownソース直接編集モードコンポーネント（CodeMirror等を利用）の実装と状態管理
- [x] 23. エディタ: ショートカット (Ctrl + /) によるソースコード直接編集モード切替機能の実装

- [x] 24. エディタ: フォーカスモード（カーソル行以外を暗くする）機能の実装とデフォルトショートカット (F8) の登録

## Phase 9: UI/UX拡張（タブ・D&D読み込み）
- [x] 25. UI/UX: 複数ファイルを開くためのタブ機能UI（表示・切替・閉じる）の実装
- [x] 26. UI/UX: タブ機能のグローバル状態管理とデフォルト無効化ロジックの実装
- [x] 27. OS連携: Markdownファイル（.md）のウィンドウへのD&Dによるファイル読み込み機能の実装

## Phase 10: メニュー拡張・設定画面・チートシート
- [x] 28. OS連携: ネイティブメニューに「タブ機能の有効/無効」「ソース直接編集モード切替」を追加しイベント連動の実装
- [x] 29. UI/UX: Markdown記法およびショートカットキーのチートシートを表示するポップアップUIの実装
- [x] 30. 設定機能: ショートカットキーのカスタマイズ用設定画面（ダイアログ等）UIの実装
- [x] 31. 設定機能: ショートカット設定の localStorage などを用いた永続化と動的反映ロジックの実装

## Phase 11: 追加要件（検索・エクスポート）
- [x] 32. ファイル管理: サイドバーのフォルダツリー部分におけるファイル名検索（フィルタリング）機能の実装
- [x] 33. エクスポート: MarkdownファイルをHTML形式へエクスポートする機能の実装
- [x] 34. エクスポート: MarkdownファイルをPDF形式へエクスポート（印刷ダイアログ連携やバックエンド変換）する機能の実装

## Phase 12: アウトライン（右サイドバー）
- [x] 35. UI/UX: 開いているMarkdownファイルのアウトライン（見出し）を表示し、開閉可能な右サイドバーUIの実装
- [x] 36. 全体テスト: 追加された全機能の結合テストとビルド検証 (`pnpm tauri dev` / `cargo check`)

## Phase 13: クイックアクションパレットのスクロール追従・ホバー表示改善
- [x] 37. 仕様策定: クイックアクションパレット（フォーカスモード/ソース編集ボタン等）のスクロール挙動・ホバー再表示仕様の整理と仕様書追記
- [x] 38. UI/UX: クイックアクションパレットのDOM配置をエディタスクロールから独立させ、右サイドバー展開時の自動オフセット調整を実装する
- [x] 39. UI/UX: スクロール量に応じたパレットの自動非表示（オートハイド）および最上部での再表示ロジックの実装
- [x] 40. UI/UX: 画面右上のトリガー領域を通じたマウスホバーによるパレット再表示（Hover Reveal）と滑らかなトランジションの実装

## Phase 14: バグ修正とフォーマット統一
- [x] 41. エディタ: Milkdownのシリアライズ設定を修正し、保存時の箇条書き記号を `-`、水平線を `---` に統一する

## Phase 15: Markdownシリアライズの一般化と番号付きリスト等の不具合修正
- [x] 42. 仕様策定: 要修正3項目（①番号付きリストの常に「数字.」維持、②連続箇条書きの「-」維持、③URL同一リンクの「[URL](URL)」維持）のシリアライズ仕様を `for_agent/architecture.md` に追記・改訂する
- [x] 43. エディタ実装: `Editor.tsx` の `remarkStringifyOptionsCtx` にカスタム `list` ハンドラーおよび `resourceLink: true` を設定し、上記3項目の一般的記法への統一・保存処理を実装する
- [x] 44. 検証スイート整備: 要修正3項目（番号付きリスト「数字.」、連続箇条書き「-」、URL同一リンク「[URL](URL)」）のシリアライズを網羅検証する自動テストスクリプト（`scripts/verify-markdown-general-serialization.mjs`）を作成し、`scripts/verify-all.mjs` に統合して全パスを確認する

## Phase 16: 未保存保護・ファイルオープン整合性・タブ状態管理・ショートカット競合の修正
- [x] 45. OS連携/ウィンドウ管理: ウィンドウクローズ（CloseRequested）時の未保存警告フックと権限設定の実装（Tauri capabilities / App.tsx）
- [x] 46. エディタ/ファイル管理: 改行コード正規化とファイルロード時の未保存誤爆防止の実装（LF統一 / ベースライン同期）
- [x] 47. UI/状態管理: タブ切り替え・新規ファイルオープン時のRef参照即時同期と未保存状態の独立性担保の実装
- [x] 48. エディタ/ショートカット: ソース直接編集モードでの「Ctrl + /」による「<!-- -->」誤挿入防止とWYSIWYG切替の競合解消（SourceEditor.tsx）
- [x] 49. 品質保証: 全4項目の修正を検証する自動テストスイートの整備と総合ビルド検証（pnpm test / cargo check）

## Phase 17: ウィンドウクローズ警告の堅牢化・オープン時未保存誤爆防止・単一ファイル切替時ステータス破棄の修正
- [x] 50. 仕様策定/設計: ウィンドウクローズ制御（Rust側 CloseRequested インターセプト）、ファイルオープン直後の未保存誤爆防止（ユーザー操作前イベントガード/初期シリアライズ同期）、および単一ファイル切替時の未保存ステータス破棄の仕様を整理し `for_agent/` に反映
- [x] 51. バックエンド/ウィンドウ管理: Tauri (Rust) 側 `WindowEvent::CloseRequested` でのクローズ一時保留（`api.prevent_close()`）とフロントエンドとの未保存確認ハンドシェイクの実装（`src-tauri/src/lib.rs`, `App.tsx`）
- [x] 52. エディタ/ファイル管理: Milkdown マウント時・ファイルロード直後の初回シリアライズ差異による未保存（Dirty）判定の誤爆防止機構の実装（`src/components/Editor/Editor.tsx`, `App.tsx`）
- [x] 53. UI/状態管理: タブ機能無効（単一ファイルモード）時に未保存変更警告を「OK」で承認して別ファイルを開いた際、未保存ステータスを確実に破棄してクリーンに開く状態リセット処理の実装（`App.tsx`）
- [x] 54. 品質保証/自動テスト: クローズ警告制御、ファイルオープン直後の未保存フラグ非表示、単一ファイル切替時のステータス破棄を網羅検証する自動テストスクリプトの作成と総合検証（`pnpm test` / `pnpm run build` / `cargo check`）

## Phase 18: タブ切り替え時の未保存マーク消失および未保存タブクローズ警告スキップの修正
- [x] 55. 仕様策定/設計: タブ切り替え時の未保存マーク消失バグおよび警告なしクローズの根本原因（エディタ再マウント時の初回シリアライズ通知による `savedContent` 上書き・`isDirty` 誤リセット）を整理し、未保存保護仕様を `for_agent/`（`architecture.md`, `guardrails.md`）に追記・改訂
- [x] 56. UI/状態管理: `handleContentChange` において未保存変更が存在するタブへの切り替え時・再マウント時に `savedContent` の上書きおよび `isDirty` リセットを防止するガードロジックの実装（`src/App.tsx`, `src/components/Editor/Editor.tsx`）
- [x] 57. タブ管理/未保存保護: タブ切り替え後の未保存状態保持とタブクローズ（`handleCloseTab`）時の保存確認ダイアログ（`window.confirm`）の確実な発火保護の実装（`src/App.tsx`）
- [x] 58. 品質保証/自動テスト: タブ有効時の「ファイル1編集 -> ファイル2オープン -> ファイル1切替 -> 未保存マーク（isDirty）維持 -> タブクローズ時警告判定」の挙動を網羅検証する自動テストスクリプト（`scripts/verify-tab-switch-dirty-retention.mjs`）を作成し、総合テスト（`pnpm test`）に統合して検証

## Phase 19: エディタの行番号表示機能
- [x] 59. 状態管理: 行番号表示設定フック `useLineNumberSettings`（localStorage `typori:line_numbers_enabled`、デフォルト有効）の実装と `App.tsx` への組込み・両エディタへの `showLineNumbers` 受け渡し
- [x] 60. ショートカット: `toggle_line_numbers`（デフォルト Ctrl+Alt+L）を `SHORTCUT_ITEMS`（設定画面）・チートシート `data.ts` に登録し、`App.tsx` の keydown ハンドラで切替を実装
- [x] 61. OS連携: 表示メニューへのチェック付き「行番号を表示」（CheckMenuItem）追加、`menu:toggle_line_numbers` イベント連携、チェック状態同期コマンド `set_line_numbers_menu_checked`（menu.rs / lib.rs / fs.ts / App.tsx）の実装
- [x] 62. ソース直接編集モード: `SourceEditor.tsx` の `basicSetup.lineNumbers` / `highlightActiveLineGutter` を `showLineNumbers` で切替
- [x] 63. WYSIWYGモード: ブロック単位の行番号オーバーレイガターとキャレットブロックハイライトを行う ProseMirror プラグイン `lineNumbersPlugin` の実装（Editor.tsx / index.css、フォーカスモード・テーマ対応）
- [x] 64. 品質保証: `scripts/verify-line-numbers.mjs` の作成と `verify-all.mjs` / `verify-native-menu.mjs` への統合、全検証コマンドのパス確認、仕様書・ガードレールの件数更新

## Phase 20: Mermaidダイアグラム機能
- [x] 65. パッケージ導入・基盤: `mermaid` パッケージの追加と、SVGレンダリング・テーマ切り替え・構文エラーハンドリングを行うユーティリティモジュール（`src/utils/mermaid.ts`）の実装
- [x] 66. チートシート連携: `CheatSheetModal/data.ts` に代表的なMermaid記法（`graph TB`, `sequenceDiagram`, `erDiagram`, `gantt`）の構文サンプルと説明を追加
- [x] 67. WYSIWYGモード: ```mermaid コードブロックを検知し、TyporaライクなSVGプレビュー表示＆クリック編集＆エラー表示を行う ProseMirror ノードビュー/プラグインの実装
- [x] 68. テーマ連動: アプリケーションのライト/ダークテーマ切り替えに連動したMermaidダイアグラムの動的再レンダリング処理の実装
- [x] 69. エクスポート連携: HTMLエクスポートおよびPDF印刷ダイアログ（iframe）におけるMermaidダイアグラムSVGレンダリングと印刷待機ハンドシェイクの実装
- [x] 70. 品質保証/自動テスト: Mermaid描画・構文エラー耐性・テーマ追従・エクスポート・チートシート整合性を網羅検証する自動テストスクリプト（`scripts/verify-mermaid-diagrams.mjs`）の作成と総合テスト（`scripts/verify-all.mjs`）への統合・全検証パス確認

## Phase 21: 起動高速化・ホワイトブランク完全解消
- [x] 71. バックエンド/IPC一括化: Rust `init_workspace` コマンド（`WorkspaceInitResult` 返却、CLI引数・カレント/親ディレクトリ走査・ファイル初期読み込みを1往復で集約）の実装と単体テスト・登録（`src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`, `src/api/fs.ts`）
- [x] 72. ウィンドウ設定 & Capabilities: Tauri 初期非表示（`tauri.conf.json` での `"visible": false`・`backgroundColor`）とフロントエンド表示権限（`capabilities/default.json` での `core:window:allow-show`）の設定
- [x] 73. ゼロフラッシュ基盤: `index.html` の `<head>` 内インラインスクリプトによる0msテーマ判定（`typori-theme` / システム配色）、初期背景色/スケルトン配置による起動時白フラッシュ完全防止
- [x] 74. 表示タイミング制御 & フォールバック: `App.tsx` での `init_workspace` 呼び出しへの移行、初回描画完了時の `getCurrentWindow().show()` 呼び出し、および起動遅延/エラー時の自動 `show()` セーフティフォールバック（フロント＆Rust）の実装
- [x] 75. バンドル最適化 & 遅延ロード: `App.tsx` および関連コンポーネントでの重いモジュール（`SourceEditor`, `CheatSheetModal`, `ShortcutSettingsModal`, `ExportModal`, `Mermaid`）の `React.lazy()` 分割と `vite.config.ts` でのチャンク最適化
- [x] 76. 品質保証/自動テスト: `init_workspace` IPCコマンド、ウィンドウ初期非表示/表示ハンドシェイク、0msテーマ判定・スケルトン、コード分割/遅延読み込みを網羅検証する自動テストスクリプト（`scripts/verify-startup-acceleration.mjs`）の作成と `scripts/verify-all.mjs` への統合・全検証パス確認

## Phase 22: リリースビルドの準備と成果物検証
- [x] 77. 設定・整合性点検: バージョン番号（package.json / tauri.conf.json / Cargo.toml）、ビルド設定、アイコンアセットの整合性確認
- [x] 78. リリースビルド実行・検証: `pnpm run build:release` によるリリースバイナリ (`typori.exe`) およびインストーラ（NSIS `.exe` / WiX `.msi`）の生成と成果物確認

## Phase 23: セキュリティ強化と脆弱性修正 (Security Hardening)
- [x] 79. Mermaid XSS対策 (CRIT-01 / MED-03): `src/utils/mermaid.ts` の `securityLevel: "strict"` 化および `secure` ロック設定追加、SVG出力サニタイズ関数（`sanitizeMermaidSvg`）の実装、`src/components/Editor/mermaidPlugin.ts` の `bindFunctions` 呼び出し除去、および `src/utils/mermaidExport.ts` の正規表現フォールバック時エラーメッセージHTMLエスケープ修正
- [x] 80. CSP設定と外部URLスキーム検証 (HIGH-01 / MED-01): `src-tauri/tauri.conf.json` への防御的 Content Security Policy (CSP) 設定追加、および `src/components/Editor/Editor.tsx` / `src/components/Editor/LinkTooltip.tsx` における外部リンク起動時の許可スキーム（`http:`, `https:`, `mailto:`）ホワイトリスト検証の実装
- [x] 81. HTMLエクスポート・PDF印刷時のサニタイズ強化 (HIGH-02): `src-tauri/src/fs.rs` の `convert_markdown_to_html` における危険な生HTMLタグ（`<script>`, `<iframe>`, `<object>` 等）・インラインイベントハンドラ・危険URIスキームのサニタイズ処理（`sanitize_exported_html`）と単体テストの実装、および `src/api/fs.ts` の `printHtmlContent` における安全化
- [x] 82. バックエンドファイルシステムIPCの境界防御・DoS対策 (HIGH-03 / MED-02): `src-tauri/src/fs.rs` の画像保存（`get_unique_file_path` / `save_image_binary` / `save_image_file`）・画像パス解決（`resolve_image_path`）・バイナリ読み込み（`read_file_binary`）におけるパストラバーサル防止・画像拡張子検証・ファイルサイズ上限（50MB）の実装、および `search_files`（`search_dir_recursive`）の再帰深度上限（16階層）・シンボリックリンク除外とRust単体テスト追加
- [x] 83. 依存パッケージの既知脆弱性解消 (LOW-01): `package.json` への `pnpm.overrides`（`source-map-js: ">=1.2.2"`, `katex: ">=0.18.2"`）追加とロックファイル更新、`pnpm audit` での検出脆弱性0件の確認
- [x] 84. 品質保証/自動テスト: Phase 23 の全セキュリティ対策（Mermaid厳格化・サニタイズ、CSP・URLスキーム検証、エクスポートHTMLサニタイズ、IPC境界防御・サイズ/深度制限、依存関係オーバーライド）を網羅検証する自動テストスクリプト（`scripts/verify-security-hardening.mjs`）の作成と `scripts/verify-all.mjs` への統合、および全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）のパス確認

## Phase 24: ソース直接編集モードの表示・レイアウト・構文ハイライト完全改善
- [x] 85. 仕様策定・設計: ソース直接編集モード（CodeMirror 6）のレイアウト仕様（行番号ガターと本文の位置関係・パディング・スクロール領域）、GFM構文拡張、コードブロック言語ハイライト（JavaScript, TypeScript, Python, Rust, HTML, CSS, JSON, Markdown 等）、およびWYSIWYG/直接編集モード間の双方向コンテンツ同期（Ref整合性・元ファイル生ソース優先維持）の仕様を `for_agent/`（`architecture.md`, `guardrails.md`）に追記・改訂
- [x] 86. 構文ハイライト & GFM対応: `@codemirror/language-data` 等による主要プログラミング言語構文パーサーの導入、`@codemirror/lang-markdown` への GFM 拡張（表、タスクリスト、自動リンク、打消し線）および `codeLanguages` の設定、Typori向けライト/ダークシンタックスハイライトテーマの整備（`src/components/Editor/SourceEditor.tsx`）
- [x] 87. レイアウト・スタイル修正: `SourceEditor.tsx` の flexbox 高さ構造（`flex-1 h-full` 重複の解消・`.cm-scroller` の overflow 最適化）、および `.cm-content` と `.cm-gutters` のマージン・パディング統合（中央寄せによるガター分離の解消、Typoraライクな美しい等幅エディタレイアウトの確立）
- [x] 88. モード切替 & コンテンツ完全同期の堅牢化: `App.tsx` の `handleToggleSourceMode`、`onExitSourceMode`、`handleSelectFile` における `isSourceModeRef` 同期漏れ解消、WYSIWYG切替時の未保存判定・生ソース完全保護、およびエディタ間でのカーソル・スクロール位置の破棄防止
- [x] 89. 品質保証/自動テスト: 直接編集モードのレイアウト、GFM構文・コードブロックハイライト、モード切替時のテキスト完全保持を網羅検証する自動テストスクリプト（`scripts/verify-source-editor-display.mjs`）の作成と `scripts/verify-all.mjs` への統合・全検証パス確認

## Phase 25: 大容量ファイル（800KB/5000行+）オープン高速化とパフォーマンス最適化
- [x] 90. 仕様策定・設計: 大容量Markdownファイルオープン時のパフォーマンス要件（オープン時間目標、強制リフローの完全排除、ビューポート仮想化、大容量ファイル検知と高速オープンモード）を `for_agent/` に追記・改訂
- [x] 91. WYSIWYG行番号ガターのビューポート仮想化（Virtualization）: `src/components/Editor/Editor.tsx` の `lineNumbersPlugin` における全ブロック同期 `coordsAtPos` ループ（Forced Reflow）を撤廃し、画面内可視領域のみを計算・描画する仮想化ガター（スクロール連動・`requestAnimationFrame`）の実装
- [x] 92. Milkdown初回マウント時シリアライズ最適化: `Editor.tsx` の `listenerCtx.mounted` における大容量ファイルの不要な全件シリアライズ（`serializer`）を抑制し、初期レンダリング時のメインスレッドブロックをゼロ化
- [x] 93. 大容量ファイル検知と直接編集モード高速オープン連携（Smart Large-File Handler）: 巨大ファイル（閾値: 300KB以上または2000行以上等）読み込み時におけるスムーズな高速オープン処理（CodeMirror 6 の仮想スクロール特性を活かした即時オープンまたはモード案内）の実装（`App.tsx`）
- [x] 94. アウトライン・画像・Mermaidの遅延ロード最適化: `OutlineSidebar.tsx` のアウトライン抽出デバウンス、DOM内ローカル画像解決（`resolveImagesInDOM`）およびMermaidレンダリングのビューポート遅延評価による初期オープン負荷軽減
- [x] 95. 品質保証/パフォーマンステスト: 800KB/5000行の模擬Markdownファイルを生成・ロードし、強制リフロー排除・行番号仮想化・大容量オープン時間・全機能整合性を網羅検証するパフォーマンステストスクリプト（`scripts/verify-large-file-performance.mjs`）の作成と `scripts/verify-all.mjs` への統合・全検証パス確認

## Phase 26: 書式クリア機能（Clear Formatting / Bare）
- [x] 96. ソース整形ロジック: 始まりと終わりのあるインライン記法全般（太字・イタリック・打ち消し線・コード・リンク等）および複合装飾に対し、選択範囲に応じた自動分割・置換（中間分割・端点分割・全体解除・ネスト解除・範囲内一括クリア・空選択ガード）を行う純粋関数（`src/utils/format.ts` 等）の実装と単体テスト
- [x] 97. ソース直接編集モード: CodeMirror 6 において選択テキストの書式クリアを実行するコマンド/関数（`clearFormatting`）の実装と、コンポーネント ref 経由での外部公開・キーマップ連携（`src/components/Editor/SourceEditor.tsx`）
- [x] 98. WYSIWYGモード: ProseMirror の `tr.removeMark(from, to)` による選択範囲の全インラインMark一括解除処理（`clearFormatting`）の実装と、コンポーネント ref 経由での外部公開・空選択ガード（`src/components/Editor/Editor.tsx`）
- [x] 99. UI・OS連携・ショートカット: OSネイティブ「編集」メニューへの「書式をクリア (CmdOrCtrl+Shift+B)」追加（`src-tauri/src/menu.rs` / `menu:clear_formatting`）、`SHORTCUT_ITEMS`（`Ctrl+Shift+B`）・チートシート早見表への掲載、クイックアクションパレット（`EditorToolbar.tsx`）へのクリアボタン配置、および `App.tsx` でのイベント購読・動的実行ハンドラの実装
- [x] 100. 品質保証/自動テスト: WYSIWYG/ソース直接編集双方での部分装飾解除・分割整形、空選択ガード、ネイティブメニュー（18イベント）、ショートカット定義、ツールバーボタンを網羅検証する自動テストスクリプト（`scripts/verify-clear-formatting.mjs`）の作成と `scripts/verify-all.mjs` への統合、および全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）のパス確認

## Phase 27: 正式版 v1.8.0 リリースビルドの準備と成果物検証
- [x] 101. バージョン整合性・ビルド設定点検: 各種設定ファイル（package.json / tauri.conf.json / Cargo.toml）のバージョンを 1.8.0 へ同期、検証スクリプト追従、および設定整合性確認 (`node scripts/verify-release-config.mjs`)
- [x] 102. リリースビルド実行・成果物検証: `pnpm run build:release` によるリリースバイナリ (`typori.exe`) およびインストーラ（NSIS `.exe` / WiX `.msi`）の生成と完全性確認 (`node scripts/verify-release-bundle.mjs`)

## Phase 28: ソース直接編集モードのインデント・レイアウト最適化および行番号・スクロール不具合の完全解消
- [x] 103. 仕様策定・設計: ソース直接編集モードのレイアウト・インデント仕様（中央寄せコンテナ・左右余白・Tabキーインデント）、Flexbox幅・縦スクロール健全化仕様、およびOSネイティブメニューチェック状態再帰同期仕様を `for_agent/`（`architecture.md`, `guardrails.md`）に策定・追記
- [x] 104. バックエンド修正（問題点C）: `src-tauri/src/menu.rs` における Submenu 再帰探索ヘルパー（`find_check_menu_item`）の実装、`set_line_numbers_menu_checked` の確実なチェック状態同期への改修、および Rust 単体テストの追加
- [x] 105. エディタスタイル・スクロール修正（問題点A & B）: `SourceEditor.tsx` の `.cm-scroller` 縦スクロール高さ修正（`height: 100%`, `maxHeight: 100%`, `overflowY: auto`）および `.cm-content` の Flexbox 幅潰れ解消（`minWidth: 0`, `flexGrow: 1`, `width: 100%`）
- [x] 106. インデント操作・描画修正（課題2 & 3）: `SourceEditor.tsx` への `indentWithTab` キーマップ登録（Tab / Shift+Tab によるインデント・アンインデント有効化）、行頭空白の描画保証（`white-space: break-spaces / pre-wrap`）およびネストリストのインデント保持
- [x] 107. エディタ全体レイアウト最適化（課題1）: ソース直接編集モードの中央寄せレイアウト設計（Typoraライクな最大幅コンテナ `max-width: 900px; margin: 0 auto;`、ガター一体型配置、左右自然余白）の実装
- [x] 108. 品質保証・自動テスト: ソースモードのインデント（Tab操作・行頭空白）、レイアウト（中央寄せ）、行番号ON/OFF時の本文表示、縦スクロール性、およびOSネイティブメニューのチェック状態再帰同期を網羅検証する自動テストスクリプト（`scripts/verify-source-editor-indent-and-scroll.mjs`）の作成と総合テスト（`scripts/verify-all.mjs`）への統合、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）の合格確認

## Phase 29: 正式版 v1.8.1 リリースビルドの準備と成果物検証
- [x] 109. バージョン整合性・ビルド設定点検: 各種設定ファイル（package.json / tauri.conf.json / Cargo.toml）のバージョンを 1.8.1 へ同期、検証スクリプト追従、および設定整合性確認 (`node scripts/verify-release-config.mjs`)
- [x] 110. リリースビルド実行・成果物検証: `pnpm run build:release` によるリリースバイナリ (`typori.exe`) およびインストーラ（NSIS `.exe` / WiX `.msi`）の生成と完全性確認 (`node scripts/verify-release-bundle.mjs`)

## Phase 30: ソース直接編集モードの行番号縦積み崩壊・スクロール不能の完全解消および生ソースインデント・レイアウトの抜本的健全化
- [x] 111. 仕様策定・原因特定・設計: 行番号ガター縦落ち（`.cm-content` の `width: 100%` による Flexbox 折り返し）、過剰スタイルによる縦スクロール不能、および Milkdown マウント時シリアライズによる生ソース（インデント）破壊の根本原因分析と再発防止仕様を `for_agent/`（`architecture.md`, `guardrails.md`）に策定・反映
- [x] 112. エディタスタイル・レイアウト抜本修正（問題点1）: `SourceEditor.tsx` の customTheme において `.cm-content` の `width: 100%` を完全撤廃、`.cm-scroller` に `display: flex !important; flex-direction: row !important;` を明示して行番号ガター（`.cm-gutters`）と本文（`.cm-content`）の確実な横並び・一体化配置を確立
- [x] 113. 縦スクロール性健全化（問題点2）: `SourceEditor.tsx` の `.cm-scroller` から `maxHeight: 100%` などの過剰プロパティを排除し、CodeMirror 6 標準の仮想スクロール（`height: 100%; overflow: auto;`）構成へ是正、マウスホイールおよびスクロールバーによる滑らかな縦スクロールを復旧
- [x] 114. 生ソースインデント保護・描画修正（問題点3）: 未編集（クリーン）ファイルにおける Milkdown マウント時シリアライズによる生ソース自動上書きを禁止（生ソースを 100% 保護）、`Editor.tsx` の Markdown シリアライザにおけるネストリストのインデント保持改修、および `SourceEditor.tsx` における Tab / Shift+Tab（`indentWithTab`）と行頭空白描画の完全保証
- [x] 115. 実証的自動テスト構築・総合品質保証: 単なる文字列一致検査を排除し、実際の CSS スタイルプロパティ（Flexbox 横並び・`width: 100%` 排除・スクロール設定）、Markdown AST のパース＆シリアライズによるネストインデント保持、および直接編集モード切り替え時の生ソース保護を実証的に検証するテストスクリプト（`scripts/verify-source-editor-layout-and-indent.mjs`）の作成と `scripts/verify-all.mjs` への統合、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）の合格確認

## Phase 31: ソース直接編集モードのショートカット誤爆完全防止・スクロール＆ガターレイアウト完全復旧・v1.8.2 テスト版ビルド
- [x] 116. 仕様策定・根本原因分析: `Editor.tsx` の `handleKeyDown` における修飾キー付きショートカット（`Ctrl + /` 等）での `markUserInteracted` 誤爆防止仕様、および `SourceEditor.tsx` の二重中央寄せ排除と CodeMirror 6 ネイティブガター・仮想スクロール完全復旧仕様を `for_agent/`（`architecture.md`, `guardrails.md`）に策定・反映
- [x] 117. エディタ修正 (問題1): `Editor.tsx` の `handleKeyDown` において `e.ctrlKey || e.metaKey || e.altKey` を含むキー押下での `markUserInteracted` 発火を厳格に抑止し、`Ctrl + /` でのモード切替時に未編集ファイルの生ソース（インデント等）が 100% 確実に保護されるように改修

- [x] 118. エディタ修正 (問題2): `SourceEditor.tsx` のレイアウトを抜本的に再設計し、二重 `max-width: 900px` を解消、CodeMirror 6 標準のガター横並び（`.cm-gutters` と `.cm-content`）および `.cm-scroller` の完全な縦スクロール（マウスホイール・ドラッグスクロール）を復旧
- [x] 119. バージョン整合性・ビルド設定点検: 設定ファイル（`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`）のバージョンを `1.8.2` に一括更新し、検証スクリプト追従と設定整合性を確認
- [x] 120. 品質保証・自動テスト・テスト版 v1.8.2 リリースビルド: 実機での `Ctrl + /` 押下シミュレーション・ガター横並び・スクロール性・全機能整合性を網羅検証するテストの整備、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）の合格、および `pnpm run build:release` による v1.8.2 テスト版インストーラ・バイナリの生成と成果物完全性検証

## Phase 32: ソース直接編集モードのインデント消失・スクロール不能・行番号縦積み崩壊の真因（Tauri CSP style-mod ブロック）解明と抜本的解消
- [x] 121. 真因特定・CSP修正・外部静的CSS構築: Tauri v2 の自動 CSP ハッシュ注入による `'unsafe-inline'` 無効化（CodeMirror 6 `style-mod` の動的 `<style>` ブロック）を解消するため `src-tauri/tauri.conf.json` に `"dangerousDisableAssetCspModification": true` を設定し、`src/index.css` に CodeMirror 6 静的レイアウト・スクロール・インデント保護（`white-space: break-spaces !important`）・シンタックスハイライト（`.tok-*`）CSS を実装、`SourceEditor.tsx` に `classHighlighter` を統合、`Editor.tsx` の未編集時 `prevContentRef` 生ソース保護を強化、自動検証テストおよびリリースビルドを更新

## Phase 33: PDF/HTMLエクスポート日本語文字化け修正・書式クリア（Ctrl + Shift + B）競合解消と全インライン記法対応・エディタ内ツールバー重複ボタン削除
- [x] 122. 仕様策定・原因特定・計画立案: 動作確認テストで判明した3件の不具合（①PDF/HTMLエクスポート時の日本語文字化け、②書式クリア `Ctrl + Shift + B` 押下時の Milkdown `blockquoteKeymap` 競合による行頭 `>` 誤挿入および全インライン記法の部分解除整合性、③エディタ内クイックアクションパレットの重複ボタン）の根本原因分析と修正仕様を `for_agent/architecture.md`・`for_agent/guardrails.md` に追記し、`Plan.md` に実装計画を策定
- [x] 123. エクスポート日本語文字化け修正 (不具合1): `src-tauri/src/fs.rs` の `sanitize_tag_attributes` における `bytes[i] as char` バイト単位キャスト（UTF-8 マルチバイト文字破壊の直接原因）を `char_indices()` ベースの文字単位処理へ全面改修し、`remove_dangerous_tags` を `to_ascii_lowercase()` に安全化、`convert_markdown_to_html` の CSS に日本語フォントファミリーを追加、日本語 Markdown の HTML/PDF エクスポート単体テスト（`cargo test`）を追加・検証
- [x] 124. 書式クリア `Ctrl + Shift + B` の引用（`>`）誤挿入競合解消 (不具合2-A): `src/components/Editor/Editor.tsx` において Milkdown `@milkdown/preset-commonmark` の `blockquoteKeymap.ctx`（デフォルト `Mod-Shift-b`）をオーバーライドして `Mod-Shift-b` による引用ブロック化（行頭 `>` 追加）を無効化し、さらに `onKeyDownCapture`（キャプチャフェーズ）で `Ctrl + Shift + B`（およびカスタム設定された `clear_formatting` ショートカット）を最優先捕捉して書式クリアのみが確実に実行されるよう改修（`Ctrl + B` の太字機能はそのまま維持）
- [x] 125. 書式クリア全インライン記法（太字・斜体・打消し線・コード・リンク・複合装飾）の部分解除完全対応 (不具合2-B): `Editor.tsx` の `clearWysiwygFormatting` を改修し、選択範囲の全インライン Mark（`strong`, `emphasis`, `strike_through`, `inlineCode`, `link` 等）解除時に選択境界前後の隣接空白 Mark も適切に除去して Markdown シリアライズ時の flanking 崩壊（`~~this ~~is~~ test~~` による装飾逆転等）を防止。さらにリテラル Markdown 記法に対する `clearInlineFormatting`（`src/utils/format.ts`）フォールバック連携および `strikethroughInputRule` の `~~...~~` 厳密化を実装し、WYSIWYG/ソース両モードで始まりと終わりのある全インライン記法の部分クリアが完全に機能することを検証
- [ ] 126. エディタ内ツールバー重複ボタン削除 (不具合3): `src/components/Editor/EditorToolbar.tsx` から、ウィンドウ上部ヘッダーと重複している「フォーカスモードに切り替え」ボタンおよび「ソース直接編集モードに切り替え」ボタンを削除し、関連テスト（`verify-focus-mode.mjs`, `verify-source-toggle.mjs` 等）のアサーションを最新UI仕様に同期
- [ ] 127. 品質保証・自動テスト・リリースビルド検証: 3件の不具合修正（日本語HTML/PDFエクスポート文字化けゼロ、`Ctrl + Shift + B` で行頭 `>` が入らず全インライン記法の部分クリアが正しく動作すること、エディタツールバー重複ボタン不在）を実証検証する自動テストスクリプト（`scripts/verify-phase33-fixes.mjs`）を作成して `scripts/verify-all.mjs` に統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`）の合格およびリリースビルド更新を確認
