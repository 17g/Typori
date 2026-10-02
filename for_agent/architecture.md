# システムアーキテクチャ・技術仕様書

## 概要
Typoraライクな高速・高機能なローカルMarkdownエディタ。
クロスプラットフォーム（Windows, macOS, Linux）で動作し、軽量かつシームレスなWYSIWYGライクな編集体験を提供する。

## 技術スタック
- **バックエンド / OSバインディング**: Rust + Tauri
  - ファイルシステムの操作（ファイルの読み書き、ディレクトリツリーの走査）を高速に処理。
  - OSネイティブなウィンドウ管理やメニュー。
- **フロントエンドフレームワーク**: React 18+ + TypeScript
  - 状態管理、UIコンポーネントの構築。
- **フロントエンド パッケージマネージャ**: pnpm
- **エディタコア**: Milkdown (ProseMirrorベース) & CodeMirror 6
  - Milkdown: MarkdownファーストなWYSIWYGエディタを実現。プラグイン拡張により、将来的な機能追加に備える。
  - CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-markdown`): ソースコード直接編集モードを提供。
- **スタイリング**: Tailwind CSS

  - ユーティリティファーストでの高速なスタイリング。
  - ダークモード等のテーマ切り替えを容易に実装。

## 主な機能要件 (フェーズ1)
1. **Markdown編集・プレビュー**:
   - Milkdownを用いたシームレスなWYSIWYGライクなエディタ。
   - WYSIWYGエディタ上でのリンク、引用、テーブルの追加。
   - 表（テーブル）の視覚的な編集・サイズ変更。
   - Typoraライクなフォーカスモード（カーソルがある行だけ明るくし、他の行を暗くする機能）。デフォルトショートカットは `F8`。
   - D&Dによる画像ファイルの挿入。
   - Markdownソース直接編集モードへの切り替え機能（OSネイティブメニューおよびショートカットから切り替え）。デフォルトショートカットは `Ctrl + /`。
   - Undo/Redo（Ctrl+Z/Ctrl+Y）をサポート。
   - **Markdownシリアライズフォーマットの一般化と記法統一**: MilkdownからのMarkdown保存・出力時（`remarkStringifyOptionsCtx`）、箇条書きリストの記号は常に `-`、連続箇条書きブロック間でもマーカーの交代を防ぎ `-` を維持、番号付きリストは常に「数字.」形式（連番ピリオド）を維持、URL同一リンクは `<URL>` への短縮を抑止して `[URL](URL)` のリソースリンク形式を維持、水平線は `---` に統一して出力する。
2. **ファイル管理**:
   - Rust側でディレクトリ走査を行い、React側でサイドバーにツリー表示する。
   - サイドバーのフォルダツリー部分にファイル名での検索機能を追加する。
   - ファイルの新規作成、保存、読み込み。
   - OSネイティブなD&DによるMarkdownファイル（.md）のシームレスな読み込み。
3. **UI/UX**:
   - TyporaライクなシンプルでクリーンなUI。
   - 邪魔にならないサイドバー（左側のファイルツリー、右側のアウトライン）、ヘッダーレスなデザイン。どちらのサイドバーも開閉可能。
   - 開いているMarkdownファイルのアウトラインを表示する右サイドバー機能。
   - タブ機能（複数のファイルを開く機能）。OSネイティブメニューから有効/無効を切り替え（デフォルトは無効）。
   - Markdown記法およびショートカットキーのチートシートを表示するポップアップ機能。
   - クイックアクションパレット（エディタツールバー: フォーカスモード切替、ソース直接編集切替、画像/表挿入、リンク編集、Undo/Redo）のフロート表示・スクロール制御。ドキュメント最上部では通常表示され、スクロール時にも画面外へ流れることなく、マウスホバー等により随時再アクセス可能なUI仕様。
4. **テーマ機能**:
   - Tailwind CSS によるライト/ダーク/システム連動テーマ切り替え。
   - `localStorage` による選択テーマの永続化と、OSのカラー設定変化への自動追従。
5. **OSネイティブメニュー連携**:
   - TauriのメニューAPIを用いたOSネイティブメニューバー（ファイル、編集、表示、ヘルプ）の提供。
   - 新規作成、保存、サイドバー表示切替などのメニューイベントをフロントエンドと双方向連携。
   - タブ機能の有効化/無効化切り替え、Markdownソース直接編集モードの切り替えをメニューに配置。
6. **設定・カスタマイズ機能**:
   - ショートカットキーの設定画面の提供。
   - 各種機能（ソースコード直接編集モード切替、フォーカスモード切替など）のショートカットキーをユーザーがカスタマイズ可能にする。
7. **エクスポート機能**:
   - MarkdownファイルをPDFおよびHTMLの形式へエクスポートする機能を提供する。

## データフロー
- フロントエンド(React) <-> バックエンド(Rust) 間の通信はTauriのコマンド(IPC)を利用する。
- 新規ファイル作成: Reactから `create_file` コマンド(Rust)にパスと初期コンテンツを渡し、ディスクに新規作成して開く。
- ファイルを開く: Reactから `open_file` コマンド(Rust)を呼び出し、ファイルの中身を受け取ってエディタに表示。
- ファイル保存: Reactから `save_file` コマンド(Rust)にパスとコンテンツを渡し、ディスクに保存。
- フォルダ表示: `read_dir` コマンド(Rust)でツリー構造を取得し、サイドバーにレンダリング。
- メニューイベント: Rustのネイティブメニューイベント（新規ファイル作成、保存、サイドバー表示切替、タブ切替、ソース編集切替等）を `app.emit` で通知し、React側で `listen` して各種アクションを実行。
- 画像ファイルの挿入と保存: OSネイティブD&D (`tauri://drag-drop`) またはエディタ領域への直接ドロップ時に、`save_image_file` / `save_image_binary` コマンド(Rust)により開いているドキュメントの `assets/` フォルダへ自動保存し、Markdown内に相対パス `assets/{fileName}` として画像ノードを挿入。
- 画像プレビュー表示: ローカル相対パスの画像をエディタ内で確実に表示するため、`resolve_image_path` および `read_file_binary` を介してBlob URLへ自動解決・キャッシュしてプレビュー描画。
- ファイル名検索・ツリーフィルタリング: サイドバーの検索入力欄に入力されたクエリに対し、フロントエンド側でロード済みツリーの即時フィルタリングを行うとともに、`search_files` コマンド(Rust)によりカレントディレクトリ配下を再帰的に走査（除外フォルダ対応・大文字小文字無視）。ヒットしたファイルまでの親フォルダ階層を自動展開してツリー表示し、マッチ箇所のテキストをハイライト描画。
- HTMLエクスポート: Rust側コマンド `convert_markdown_to_html` / `export_to_html` (pulldown-cmark利用) により、CommonMark/GFM（テーブル・タスクリスト・打ち消し線など）に完全準拠したスタンドアロンHTML文書（ドキュメントタイトル、レスポンシブタイポグラフィ、ライト/ダークテーマCSSスタイル内蔵、印刷最適化）を高速・安全に生成・保存。UI側の `ExportModal`、ヘッダーのエクスポートボタン、カスタマイズ可能なショートカット (Ctrl+Shift+E)、およびOSネイティブメニュー連携 (`menu:export_html`) と連動。
- PDFエクスポート: Rust側コマンド `export_to_pdf_html` および `convert_markdown_to_html` による印刷最適化スタイル内蔵HTML（`@page` ページマージン・A4サイズ自動調整、背景白・文字黒のハイコントラスト印刷カラー、見出し直後の改ページ回避、テーブル・画像・コードブロックの途中分割防止）の生成と、フロントエンド側の非表示iframe・印刷API連携（`printHtmlContent` / `printMarkdownDocument`）により、OS標準の印刷ダイアログ（「PDFに保存」対応）をシームレスに起動。UI側の `ExportModal`（HTML/PDF形式タブ切替）、ヘッダーのPDFエクスポートボタン、カスタマイズ可能なショートカット (Ctrl+Shift+P / Ctrl+P)、およびOSネイティブメニュー連携 (`menu:export_pdf`) と連動。
- アウトライン（右サイドバー）機能: 開いているMarkdownドキュメントの見出し（`#`〜`######`）をリアルタイムに抽出し、インデント付きツリーで表示。見出しクリック時にはWYSIWYG（ProseMirror DOM）およびソース直接編集モード（CodeMirror 6）の該当見出し位置へスムーズスクロールし、ターゲット要素を一時的にパルスハイライト描画。右サイドバーの開閉はヘッダーボタン、ショートカット (Ctrl+Shift+O)、およびOSネイティブメニュー (`menu:toggle_right_sidebar`) と双方向連動。
- 全体結合テスト・品質保証: 全17項目の個別機能検証スクリプト、Tauri IPCコマンド登録整合性、OSネイティブメニューイベント双方向整合性、ショートカット定義競合なしを一括検証する総合テストスイート (`scripts/verify-all.mjs`) を整備。`pnpm test`、`pnpm run build`、`cargo test`、`cargo check`、`cargo clippy` の全自動検証パス。
- クイックアクションパレット（EditorToolbar）のフロート表示・スクロール制御仕様:
  フォーカスモード切替、ソース直接編集切替、画像/表挿入、リンク編集、引用、Undo/Redoを提供するクイックアクションパレットについて、エディタスクロール時に本文と一緒に画面外へ押し流されて消えてしまう問題を解消し、以下の通り仕様を策定・定義する。
  - **仕様方針の整理と採択**:
    - **採択仕様: スクロール時オートハイド & マウスホバー再表示（Hover Reveal）**
      - **最上部表示（Scroll Top）**: ドキュメント最上部（スクロール量ゼロ付近）では、パレットを通常表示（控えめな半透明 `opacity-60`、ホバー時 `opacity-100`）。
      - **スクロール時自動非表示（Auto-hide）**: ドキュメントを下にスクロールした際は、執筆・閲覧空間のシンプルさを保ち視覚的ノイズを極小化するため、パレットを自動的にフェードアウト（非表示化: `opacity-0 pointer-events-none`）。
      - **マウスホバー再表示（Hover Reveal）**: 画面右上（パレット配置エリア / トリガー検知ゾーン）にマウスカーソルが乗った（ホバーした）とき、またはエディタ最上部へスクロールバックしたときに、即座にスムーズにフェードイン（`opacity-100 pointer-events-auto`）して再表示される。
      - **離脱時フェードアウト**: マウスカーソルがトリガー領域から外れると、滑らかにフェードアウトする。
      - **設計理念との整合**: これにより、Typoriの基本思想である「思考を邪魔しない、美しい執筆空間」と、スクロール途中での各種機能への即時アクセシビリティを高い次元で両立する。
    - **代替仕様の整理（常時固定フロート表示 / Fixed Floating）**:
      - ドキュメントのスクロール位置に関わらず、ビューポート右上に常時固定配置する方式。通常時は低不透明度（`opacity-40`〜`60`）で本文の可読性を妨げず、ホバー時に `opacity-100` で強調表示する。
      - ※将来的なユーザー設定やカスタマイズ等で「常時固定表示」と「ホバー再表示」を選択可能とする拡張性を担保する。
  - **DOM配置・レイアウト構造**:
    - パレット要素をスクロールコンテナ（`.typori-editor-wrapper`）の内部スクロール追従から独立させ、ビューポートまたはエディタ親要素を基準としたフロート固定（Fixed / 独立配置）とする。
    - 右サイドバー（アウトライン）展開時は、サイドバーと重ならないよう配置オフセット（右マージン）を自動調整する。
  - **インタラクション・アクセシビリティ仕様**:
    - 表示・非表示のトランジションは 150ms〜200ms のスムーズなイージング（`transition-opacity transition-transform`）を適用。
    - 非表示時はクリックイベントを無効化（`pointer-events-none`）し、背後のエディタテキストの選択・編集を一切妨げない。
    - パレットの表示・非表示状態に関わらず、各種機能のキーボードショートカット（F8: フォーカスモード、Ctrl+/: ソース直接編集、Ctrl+K: リンク挿入、Ctrl+Z/Y: Undo/Redo）は常時完全に機能する。
- Markdownシリアライズ仕様（一般化と記法統一）:
  Milkdown（ProseMirror）からMarkdownテキストへのシリアライズおよびファイル保存処理（`remarkStringifyOptionsCtx`）において、ユーザーが意図した記法の維持、可読性、およびTyporaライクなMarkdownフォーマットの整合性を担保するため、以下のシリアライズ仕様を厳格に適用・維持する。
  1. **番号付きリストの常に「数字.」維持 (Ordered List Marker)**:
     - 番号付きリスト（ordered list）のシリアライズ時、デリミタ記号は常にピリオド `.` を使用し、項目番号は常に「数字.」（例: `1. `, `2. `, `3. ` ...）の連番インクリメント形式を一貫して出力・維持する。カッコ形式（`1)`）等への変形や番号の欠損を防止する。
  2. **連続箇条書きの「-」維持 (Bullet List Marker in Adjacent Lists)**:
     - 箇条書き記号はハイフン `-` に統一する（`bullet: "-"`）。
     - 連続・隣接する箇条書きリストブロックが存在する場合でも、`mdast-util-to-markdown` のデフォルト挙動によるマーカー交代（`bulletOther` による `*` 等へのフォールバック）をカスタム `list` ハンドラー等により抑止し、すべての箇条書き項目で一貫して `-` 記号を維持する。
  3. **URL同一リンクの「[URL](URL)」維持 (Resource Link Preservation)**:
     - リンクの表示テキストとリンク先URLが完全に同一である場合（例: `[https://github.com](https://github.com)`）であっても、自動リンク記法（`<https://github.com>`）への勝手な自動縮約・変換を行わず、常に明示的なMarkdownリソースリンク形式 `[URL](URL)` を維持してシリアライズする（`resourceLink: true` の適用）。
  4. **水平線記号の統一 (Thematic Break)**:
     - 水平線は常にスペースなしのハイフン3つ `---`（`rule: "-"`, `ruleRepetition: 3`, `ruleSpaces: false`）に統一してシリアライズする。

- ウィンドウクローズ時の未保存保護とTauri Capabilities連携仕様:
  - ユーザーが未保存の変更を保持した状態でウィンドウの「×」ボタンを押下した際、アプリが即座に強制終了してデータが失われるのを防ぐため、OS連携および未保存保護フックを実装。
  - **Tauri Capabilities権限設定**: `src-tauri/capabilities/default.json` にウィンドウ制御およびイベント購読に必要な権限（`core:window:default`, `core:window:allow-close`, `core:window:allow-destroy`, `core:event:default`, `core:event:allow-listen`, `core:event:allow-unlisten`）を明示的に付与。
  - **フロントエンドクローズ購読**: `App.tsx` において `@tauri-apps/api/window` の `getCurrentWindow().onCloseRequested` を購読。未保存ドキュメントが存在する場合は `event.preventDefault()` によりウィンドウの即時破棄を抑止。
  - **未保存判定（単一・タブ両対応）**: `getUnsavedDocuments` により、単一ファイルモードおよびタブ有効モード双方で未保存ファイル（`fileContentRef` / `editorRef.current.getMarkdown()` vs `savedContentRef`、および全タブの `isDirty`）を網羅的に検出。
  - **確認ダイアログ & 安全な終了**: 未保存ファイル名を含む `window.confirm` ダイアログを提示。ユーザーが終了を承認した場合は `appWindow.destroy()` を明示的に呼び出してウィンドウを破棄・終了し、キャンセルの場合はウィンドウを開いたまま作業を継続可能とする。同時にWeb標準の `beforeunload` リスナーも併用しブラウザ/リロード離脱からも保護。

- 改行コード正規化と未保存判定（LF統一 / ベースライン同期）仕様:
  - **改行コードLF統一**: Windows環境等でディスク上に保存されたファイルが CRLF (`\r\n`) 改行であっても、ファイル読み込み時（`openFile`）およびエディタへのセット時に、コンテンツの改行コードを LF (`\n`) に統一正規化（`normalizeLineEndings`）。
  - **未保存誤爆防止（isContentDirty）**: Milkdown（ProseMirror）および CodeMirror 6 は内部で LF でテキストを保持するため、ファイル読み込み直後のベースライン（`savedContent`, `TabItem.savedContent`）も同一の正規化後テキストで同期。未保存判定（`isContentDirty`）では改行コードの違いのみ（CRLF vs LF）による不一致を検知して誤爆することを防止し、実質的な編集内容の変更のみを正確に未保存状態（●印および未保存アラート）として判定。
  - **全データフローでの一貫同期**: 初期起動時、ファイル選択時、新規作成時、タブ切り替え時、およびファイル保存時において、コンテンツとベースライン双方で `normalizeLineEndings` および `isContentDirty` を適用し、レースコンディションや改行コード差分による状態不整合を根絶。

- タブ切り替え・ファイルオープン時のRef参照即時同期と未保存状態の独立性担保仕様:
  - **即時Ref同期（Immediate Ref Synchronization）**: Reactの再レンダリング待ちによるステート参照遅延（stale closure / race conditions）を根絶するため、`handleSelectTab`、`handleSelectFile`、`handleCreateFile`、`handleCloseTab`、`handleSave`、`handleContentChange` において、`tabsRef.current`、`activeTabIdRef.current`、`selectedPathRef.current`、`fileContentRef.current`、`savedContentRef.current` をイベントハンドラ内で即座に同期更新。
  - **未保存状態のタブ間完全独立性（Tab Dirty State Isolation）**: タブ切り替え時、切り替え元タブの編集内容は `tabsRef` に正確に退避・保持され、切り替え先タブの未保存状態は切り替え元と一切干渉せず、対象タブ自身の `content` と `savedContent` から `isContentDirty` により完全に独立して再計算・反映。新規ファイルオープン時および新規作成時も、必ず `isDirty: false` で独立初期化。
  - **TabBar未保存判定統一**: `TabBar.tsx` における未保存判定を生の `!==` から `isContentDirty` に統一し、改行コードの相違による誤爆を根絶。
  - **エディタコンポーネントのキー分離**: `TyporiEditor`（`key={selectedPath}`）に加え、ソース直接編集モード `SourceEditor` にも `key={selectedPath ?? "__source__"}` を付与し、ファイル・タブ切り替え時にエディタ内部状態（CodeMirrorの履歴やカーソル位置等）が混交しないよう完全独立化。

- ソース直接編集モードでの「Ctrl + /」による「<!-- -->」誤挿入防止とWYSIWYG切替競合解消仕様:
  - **根本原因の完全解明**: CodeMirror 6 の `basicSetup` に含まれる `defaultKeymap` は `Mod-/`（Ctrl+/ / Cmd+/）に対して行コメントコマンド `toggleComment` をバインドしており、Markdown モード下では `<!-- -->` を挿入する挙動を持つ。また、React コンポーネント内の通常のキーマップ拡張は `defaultKeymap` より後に評価されるため、`toggleComment` が優先実行されて本文が汚染され、さらに `window` へのバブリングにより親コンポーネント（`App.tsx`）でもモード切替が二重検知される競合が発生していた。
  - **二重最高優先度インターセプト（Prec.highest）**:
    1. **DOMレベル（EditorView.domEventHandlers）**: `Prec.highest` で登録された DOM `keydown` リスナーにより、CodeMirror 内部のキーマップ処理より先に `(Ctrl/Cmd) + /`（スラッシュキー、テンキー除算記号 `NumpadDivide`、JISキー等を含む）を捕捉。`event.preventDefault()` および `event.stopPropagation()` を即時実行して親ウィンドウへのバブリングと CodeMirror のデフォルトコメント処理を完全に遮断し、最新のモード切替ハンドラを直接呼び出す。
    2. **CodeMirror キーマップレベル（keymap.of）**: 念のため `keymapExtension` にも `Prec.highest` を適用し、`Mod-/` ハンドラ（`preventDefault: true`, `stopPropagation: true`）を `defaultKeymap` より先に評価・消費（handled: true）させ、`toggleComment` の発火可能性を根本的に根絶。
  - **最新コールバック参照の同期（Callback Refs）**: `onSaveRef`, `onToggleSourceModeRef`, `onExitSourceModeRef`, `onToggleFocusModeRef` を常に最新のプロップ値で同期し、`onToggleSourceMode` と `onExitSourceMode` のいずれが渡された場合でもシームレスに WYSIWYG モードへの復旧・切替を保証。

## パッケージング・配布仕様
- `pnpm tauri build` により、リリースビルドバイナリ (`typori.exe`) および各プラットフォーム向けインストーラパッケージ（Windows向け: NSIS `.exe` インストーラおよび WiX `.msi` パッケージ）を生成。
- バンドル生成先: `src-tauri/target/release/bundle/`

## 改訂履歴
- 2026-09-26: 初版策定
- 2026-09-27: 新規ファイル作成機能 (`create_file`) のデータフローを追記
- 2026-09-27: ライト/ダーク/システム連動テーマ切り替え機能の仕様を追記
- 2026-09-27: OSネイティブメニュー（Tauri Menu API）およびイベント連携の仕様を追記
- 2026-09-27: リリースパッケージング（NSIS / MSI インストーラ生成）仕様を追記
- 2026-09-27: Undo/RedoおよびD&Dオープン機能の仕様を追記
- 2026-09-28: タブ機能、WYSIWYG機能強化、ソース編集切替、フォーカスモード等の要件を追加
- 2026-09-28: ソースコード直接編集モード・フォーカスモードのデフォルトショートカットキー、および設定画面の要件を追加
- 2026-09-28: PDF・HTMLへのエクスポート機能、およびサイドバーのファイル検索機能の要件を追加
- 2026-09-29: D&Dによる画像ファイルの挿入と保存処理・ローカルプレビュー表示ロジックの仕様を追記
- 2026-09-29: Markdownソース直接編集モード（CodeMirror 6）コンポーネントの実装と状態管理の仕様を追記
- 2026-09-30: ショートカット (Ctrl + /) によるソースコード直接編集モード切替機能、双方向コンテンツ同期、およびUIヒント表示の仕様を追記
- 2026-09-30: フォーカスモード機能（カーソル行・ブロック以外を暗くするフェード処理）、ショートカットキー (F8)、Tauriメニュー連携、およびWYSIWYG・ソースモード双方でのUI対応の仕様を追記
- 2026-09-30: 複数ファイルを開くためのタブ機能UI（TabBarコンポーネント、表示・切替・閉じる、未保存インジケータ、Ctrl+Wショートカット、中クリッククローズ、コンテンツ自動保護）の仕様を追記
- 2026-09-30: タブ機能のグローバル状態管理（useTabSettings、localStorage永続化）とデフォルト無効化（単一ファイルモード・TabBar非表示・未保存保護）および切替トグルロジック（UIボタン、Ctrl+Shift+T、menu:toggle_tabs連携）の仕様を追記
- 2026-09-30: OSネイティブメニュー（表示メニュー）への「タブ機能の有効/無効 (CmdOrCtrl+Shift+T)」「ソース直接編集モードの切替 (CmdOrCtrl+/)」項目の追加と、フロントエンド双方向イベント連携（menu:toggle_tabs, menu:toggle_source_mode）の実装仕様を追記
- 2026-09-30: Markdown記法およびショートカットキーのチートシートモーダルUI（CheatSheetModal、タブ切替・検索・カテゴリ絞り込み・コードコピー機能）、ヘッダー呼び出しボタン、ショートカットキー (F1 / Ctrl+Shift+?)、およびTauriネイティブヘルプメニュー連携（menu:open_cheatsheet）の実装仕様を追記
- 2026-09-30: ショートカットキーカスタマイズ設定画面モーダルUI（ShortcutSettingsModal、キー入力検知・記録、重複/競合警告、カテゴリ別検索・絞り込み、個別/一括デフォルト初期化、ヘッダー設定ボタン、ショートカット Ctrl+,、およびTauriネイティブメニュー連携 menu:open_shortcuts_settings）の実装仕様を追記
- 2026-09-30: ショートカット設定の永続化管理フック (useShortcutSettings、localStorage連携 typori:shortcuts_config、デフォルト設定との安全マージ) と動的キーバインド反映ロジック (App.tsx での動的ショートカット判定・各ボタンツールチップの動的同期、CheatSheetModal / ShortcutSettingsModal 連携) の仕様を追記
- 2026-09-30: サイドバーのフォルダツリーにおけるファイル名検索（フィルタリング）機能（検索入力バー、デバウンス検索、Rust側再帰検索コマンド search_files、未展開親フォルダの自動階層展開、マッチ文字列ハイライト表示、0件空状態UI、Ctrl+Fショートカット連携）の実装仕様を追記
- 2026-09-30: HTMLエクスポート機能（pulldown-cmarkによるスタンドアロンHTML生成、ライト/ダークCSSテーマ内蔵、ExportModal UI、ヘッダーエクスポートボタン、ショートカット Ctrl+Shift+E、Tauriメニュー連携 menu:export_html）の実装仕様を追記
- 2026-10-01: PDFエクスポート機能（印刷ダイアログ連携、@page・@media print印刷CSS最適化、Rust側コマンド export_to_pdf_html、ExportModal形式切替タブ、ヘッダーPDFボタン、ショートカット Ctrl+Shift+P / Ctrl+P、Tauriメニュー連携 menu:export_pdf）の実装仕様を追記
- 2026-10-01: アウトライン（右サイドバー）機能（見出し抽出・インデント表示・クリック時の該当見出しスムーズスクロール & パルスハイライト・OSメニュー menu:toggle_right_sidebar 連携）の仕様を追記
- 2026-10-01: 全体テストおよび結合検証の完了（総合結合テストスイート verify-all.mjs、IPCコマンド・ネイティブメニュー完全双方向検証、cargo/pnpm総合品質保証）を記録
- 2026-10-01: クイックアクションパレット（エディタツールバー）のフロート表示・スクロール制御仕様（スクロール時オートハイド＆マウスホバー再表示、常時固定表示との比較整理、DOM配置独立化、トランジション仕様）を追記
- 2026-10-01: WYSIWYGモードでの表・引用追加後のパラグラフ自動挿入（plugin-trailing）、ソース直接編集モードのショートカット（Ctrl+/）競合解消、サイドバーのダブルクリックによるパス移動と新規作成時のパス表示UX改善、チートシートの表作成方法の注記追記によるUX改善と不具合修正を実施
- 2026-10-02: Milkdownの保存・出力時における箇条書き記号（`-`）および水平線記号（`---`）のフォーマット統一仕様を追記
- 2026-10-02: クイックアクションパレットのスクロール量に応じた自動非表示（オートハイド）および最上部での再表示ロジック（閾値判定・フェードアウト・pointer-events制御・テストスクリプト verify-palette-scroll.mjs）の実装を追記
- 2026-10-02: 画面右上のトリガー領域を通じたマウスホバーによるパレット再表示（Hover Reveal）および滑らかなトランジション（opacity/transform 200ms イージング、非表示時 pointer-events-none、テストスクリプト verify-palette-hover.mjs）の実装を追記
- 2026-10-02: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コードの突き合わせ、バックエンド単体テスト（24件）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド、および総合結合テストスイート（21件）の全自動検証パス（Exit Code 0）を確認し、仕様整合性を確認・更新。
- 2026-10-02: Markdownシリアライズの一般化と不具合修正に関する仕様策定（①番号付きリストの常に「数字.」維持、②連続箇条書きの「-」維持、③URL同一リンクの「[URL](URL)」リソースリンク維持）を追記
- 2026-10-02: OS連携/ウィンドウ管理: ウィンドウクローズ（CloseRequested）時の未保存警告フックと権限設定（src-tauri/capabilities/default.json の core:window / core:event 権限追加、App.tsx での appWindow.onCloseRequested 購読・未保存検出・確認ダイアログ・destroy 実行、verify-window-close-requested.mjs 整備）を追記
- 2026-10-02: エディタ/ファイル管理: 改行コード正規化とファイルロード時の未保存誤爆防止の実装（LF統一 / ベースライン同期、src/utils/text.ts の normalizeLineEndings / isContentDirty 導入、App.tsx / Editor.tsx / fs.ts 連携、verify-line-endings-normalization.mjs 整備）を追記
- 2026-10-02: UI/状態管理: タブ切り替え・新規ファイルオープン時のRef参照即時同期と未保存状態の独立性担保の実装（App.tsx での tabsRef/activeTabIdRef/selectedPathRef/fileContentRef/savedContentRef 即時更新、TabBar.tsx の isContentDirty 統一、SourceEditor の key 分離、verify-tabs-ref-sync.mjs 整備）を追記
- 2026-10-02: エディタ/ショートカット: ソース直接編集モードでの「Ctrl + /」による「<!-- -->」誤挿入防止とWYSIWYG切替競合解消の実装（SourceEditor.tsx での Prec.highest 適用、domEventHandlers による先行捕捉・preventDefault / stopPropagation 実行、コールバック Ref 同期）を追記







