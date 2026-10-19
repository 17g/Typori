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
- **ダイアグラムレンダリング**: Mermaid
  - Markdown内の ```mermaid コードブロックをSVGダイアグラムとして描画。

## 主な機能要件 (フェーズ1)
1. **Markdown編集・プレビュー**:
   - Milkdownを用いたシームレスなWYSIWYGライクなエディタ。
   - WYSIWYGエディタ上でのリンク、引用、テーブルの追加。
   - 表（テーブル）の視覚的な編集・サイズ変更。
   - Typoraライクなフォーカスモード（カーソルがある行だけ明るくし、他の行を暗くする機能）。デフォルトショートカットは `F8`。
   - D&Dによる画像ファイルの挿入。
   - Markdownソース直接編集モードへの切り替え機能（OSネイティブメニューおよびショートカットから切り替え）。デフォルトショートカットは `Ctrl + /`。
   - Undo/Redo（Ctrl+Z/Ctrl+Y）をサポート。
   - **書式をクリア（Bare）機能**: 装飾（太字、イタリック、打ち消し線、インラインコード、リンク等）がかかっている文字列の一部分または全体を選択して装飾を解除し、素のテキストに戻す機能。WYSIWYGモードおよびソース直接編集モードの双方で動作し、Markdown記法デリミタを自動で分割・整形する。デフォルトショートカットは `Ctrl + Shift + B`。
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
   - エディタ左端への行番号表示機能（ソース直接編集モードでは物理行単位、WYSIWYGモードではブロック単位）。キャレットのある行番号をハイライト表示する。OSネイティブメニュー（表示メニュー）およびショートカット（デフォルト `Ctrl + Alt + L`）から有効/無効を切り替え（デフォルトは有効）。詳細は「行番号表示機能仕様」を参照。
4. **テーマ機能**:
   - Tailwind CSS によるライト/ダーク/システム連動テーマ切り替え。
   - `localStorage` による選択テーマの永続化と、OSのカラー設定変化への自動追従。
5. **OSネイティブメニュー連携**:
   - TauriのメニューAPIを用いたOSネイティブメニューバー（ファイル、編集、表示、ヘルプ）の提供。
   - 新規作成、保存、サイドバー表示切替などのメニューイベントをフロントエンドと双方向連携。
   - タブ機能の有効化/無効化切り替え、Markdownソース直接編集モードの切り替え、行番号表示の有効化/無効化切り替え（チェック状態付き）、および編集メニューの「書式をクリア」をメニューに配置。
6. **設定・カスタマイズ機能**:
   - ショートカットキーの設定画面の提供。
   - 各種機能（ソースコード直接編集モード切替、フォーカスモード切替、行番号表示切替、書式クリアなど）のショートカットキーをユーザーがカスタマイズ可能にする。
7. **エクスポート機能**:
   - MarkdownファイルをPDFおよびHTMLの形式へエクスポートする機能を提供する。
8. **Mermaidダイアグラム機能**:
   - ````mermaid コードブロックによる各種ダイアグラム（ER図、シーケンス図、フローチャート、ガントチャート等、Mermaid標準記法全般）のインライン描画・編集。
   - 通常時はダイアグラム（SVG）を表示し、クリック／選択時にソースコードを展開して編集できるTyporaライクなインタラクションを提供。
   - アプリケーション全体のテーマ（ライト／ダーク）と連動したダイアグラムテーマの切り替え。
   - HTMLエクスポートおよびPDFエクスポート（印刷）時にもMermaidダイアグラムを描画結果として保持・出力。
   - チートシート（F1）に代表的なMermaid記法のサンプルを追加。
9. **起動高速化・ホワイトブランク完全解消機能**:
   - 起動時のウィンドウ初期非表示（`visible: false`）と初期描画完了直後の即時ウィンドウ表示（`window.show()`＋セーフティフォールバック）、および `index.html` での即時テーマ背景色・スケルトン適用を組み合わせたハイブリッド構成により、起動時のホワイトブランク（白画面フラッシュ）を完全に解消。
   - 起動直後に不要な重いモジュール（CodeMirror 6、各種モーダル、Mermaid等）の動的インポート分割（Code Splitting / Lazy Loading）と、起動時ワークスペース初期化IPCの一括化（`init_workspace`）により、起動時間を最小化。

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
- 書式クリア（Bare）機能: 選択範囲の装飾を解除する操作に対し、WYSIWYGモードでは ProseMirror の `removeMark` により全マークを一括解除し、Milkdown のシリアライザにより Markdown 記法を自動分割整形。ソース直接編集モードでは構文解析により `**前**選択テキスト**後**` のようにデリミタを自動分割置換。ショートカット（Ctrl+Shift+B）、OSネイティブメニュー (`menu:clear_formatting`)、クイックアクションパレット（EditorToolbar）のボタン押下から一貫して呼び出し可能。
- 全体結合テスト・品質保証: 全51項目の個別機能検証スクリプト、Tauri IPCコマンド登録整合性（15コマンド）、OSネイティブメニューイベント双方向整合性（18イベント）、ショートカット定義競合なしを一括検証する総合テストスイート (`scripts/verify-all.mjs`) を整備。`pnpm test`、`pnpm run build`、`cargo test`、`cargo check`、`cargo clippy` の全自動検証パス。
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
  - **フロントエンドクローズ購読**: `App.tsx` において `@tauri-apps/api/window` の `getCurrentWindow().onCloseRequested` を購読。未保存ドキュメントが存在する場合は `event.preventDefault()` によりウィンドウの即時破棄を抑止。※Phase 17 以降、主経路は Rust 側 CloseRequested インターセプト（`window:close_requested` イベント）であり、`onCloseRequested` はフォールバックとして併存する。両経路は共通の `executeCloseWorkflow` を呼び出し、`isHandlingClose` フラグで同時実行を排他する。
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

- ウィンドウクローズ制御（Rust側 CloseRequested インターセプトと双方向ハンドシェイク）仕様:
  - **ネイティブクローズインターセプト**: Rust側 (`src-tauri/src/lib.rs`) の `tauri::Builder::default()` において `.on_window_event` を実装し、`tauri::WindowEvent::CloseRequested { api, .. }` を捕捉。`api.prevent_close()` を無条件実行して OS ネイティブのウィンドウ即時破棄を確実に一時保留（インターセプト）する。
  - **フロントエンド連携イベント通知**: クローズ保留後、該当ウィンドウに対して Tauri イベント `window.emit("window:close_requested", ())` を発行。
  - **未保存確認と安全な終了ハンドシェイク**: フロントエンド (`App.tsx`) は `"window:close_requested"` を受信後、`getUnsavedDocuments()` を実行。未保存ファイルが存在する場合は未保存ファイル名を列挙した確認ダイアログ（`window.confirm`）を表示し、ユーザーが承認（OK）した場合は `getCurrentWindow().destroy()` を呼び出してアプリを終了、キャンセルの場合はそのまま作業を継続。未保存ファイルが存在しない場合はダイアログを表示せず即座に `getCurrentWindow().destroy()` で終了する。

- ファイルオープン直後の未保存誤爆防止（ユーザー操作前イベントガード / 初期シリアライズ同期）仕様:
  - **初期シリアライズ差異の吸収**: Milkdown（Remark / ProseMirror）マウント時およびファイルロード直後、ASTパースおよびシリアライズの微細なフォーマット差異により `markdownUpdated` が発火して `onChange` がトリガーされ、無編集にもかかわらず `isContentDirty` が `true` に誤爆する現象を根絶。
  - **ユーザー操作前イベントガード**: エディタマウント完了時および新規ファイルロード完了時、ユーザーによる能動的な編集操作（キーストローク・コマンド）が行われる前の自動シリアライズ差異を初期安定状態として検知し、誤った Dirty マーク（●印）の点灯を防止。
  - **ベースライン自動アライメント（Baseline Realignment）**: ファイルロード完了直後の初期シリアライズ結果を `savedContentRef` および `TabItem.savedContent` の基準値として同期させ、実質的なユーザー編集のみを未保存変更として検知する。

- 単一ファイル切替時の未保存ステータス破棄とクリーン状態リセット仕様:
  - **未保存破棄の確定と完全リセット**: タブ機能無効時（単一ファイルモード）において未保存変更がある状態で別ファイルを開く際、未保存警告ダイアログで「OK（保存せずに別ファイルを開く）」を選択した場合、前のファイルの未保存変更は確実に破棄される。
  - **ステート・Ref・バッファの完全初期化**: 別ファイルの読み込み（`openFile`）直後に、`isDirty: false`、`fileContent = newContent`、`savedContent = newContent`、`saveStatus = null`、`saveError = null`、`fileError = null` を同期的かつ完全にリセットし、切り替え前の Dirty 状態や保存ステータスの残骸が引き継がれるのを防止。
  - **コンポーネントキー分離による内部キャッシュ破棄**: `TyporiEditor` および `SourceEditor` に渡す `key={selectedPath}` により、ファイル切り替え時にエディタを完全クリーンに再マウントし、内部 Undo/Redo 履歴やバッファを完全に初期化。

- タブ切り替え時の未保存状態保持および未保存タブクローズ保護仕様 (Phase 18):
  - **根本原因の整理**:
    - タブ有効時、未保存変更（`isDirty: true`, `savedContent !== content`）を持つタブAからタブBへ切り替え、再びタブAに戻った際、`TyporiEditor`（Milkdown）が `key={selectedPath}` により再マウントされる。
    - 再マウント完了時に `Editor.tsx` の `listenerCtx.mounted` から `hasUserInteractedRef.current` が `false` の状態で `onChange(initialSerialized, { isUserInteraction: false })` が通知される。
    - `App.tsx` の `handleContentChange` が、対象タブが未保存変更を持っているかどうかの判定を行わずに、`meta.isUserInteraction === false` を契機として `savedContent` および `savedContentRef` を編集後の内容で無差別に上書きし、`isDirty: false` にリセットしていた。
    - これにより、タブ切り替え後に未保存マーク（●）が消失し、`savedContent === content` と誤認されるため、タブクローズ時（`handleCloseTab`）やウィンドウ終了時（`getUnsavedDocuments`）の保存確認ダイアログ（`window.confirm`）がスキップされ、未保存の変更が警告なしに消失する不具合が発生していた。
  - **未保存タブの保護・ガード仕様（Dirty Tab Preservation Guard）**:
    - `handleContentChange` において、`meta?.isUserInteraction === false`（エディタ再マウント時・初回シリアライズ通知）を受信した場合でも、**対象タブが既に未保存変更を持っている場合**（`activeTab.isDirty === true` または `isContentDirty(activeTab.content, activeTab.savedContent)`、あるいは `savedContentRef` とディスク保存基準値が未保存状態を示している場合）は、`savedContent` / `savedContentRef` の上書きおよび `isDirty: false` へのリセットを行わず、既存の `savedContent` および `isDirty: true` を厳格に維持・保護する。
    - 初期シリアライズによる `savedContent` ベースライン更新および `isDirty: false` リセットを適用するのは、**新規ファイルオープン直後または直前に保存されたクリーンな状態（`isDirty === false` かつ実質未編集）のタブに限定**する。
  - **タブクローズ時の未保存警告保護仕様（Tab Close Protection）**:
    - `handleCloseTab` において、対象タブが未保存変更を保持している場合（`tab.isDirty || isContentDirty(tab.content, tab.savedContent)`）、アクティブタブ・非アクティブタブを問わず、必ず `window.confirm` による保存確認ダイアログを表示し、ユーザーの明示的承認が得られない限りタブクローズを中断する。
  - **タブ切り替え・データフローの整合性担保**:
    - タブ切り替え操作（`handleSelectTab`）において、切り替え元タブの編集内容は `tabsRef` に即時同期・退避され、切り替え先タブの未保存ステータス（`isDirty`, `savedContent`, `content`）はエディタ再マウントを経ても完全不変に維持される。

- 行番号表示機能仕様 (Phase 19):
  - **目的**: 文書内の位置把握や、他者とのレビュー時の位置指示を容易にするため、エディタ左端に行番号ガターを表示する。
  - **対象モードと番号の単位**:
    - **ソース直接編集モード（CodeMirror 6）**: Markdownソースの物理行（改行区切り）単位で `1` から連番を表示する。CodeMirror 6 標準の `lineNumbers()` 拡張（`@codemirror/view`）を利用し、折り返し表示された行には番号を重複表示しない。
    - **WYSIWYGモード（Milkdown / ProseMirror）**: Markdownソースの行番号とは対応させず、**ブロック単位**で `1` から連番を表示する。番号付けの単位は「テキストを持つ最小単位のブロック」とし、段落・見出し・リスト項目内の段落・引用内の段落・コードブロック・表・水平線・画像（ブロック画像）をそれぞれ1つとして数える。リスト全体や引用全体などのコンテナブロック自体には番号を振らない。表とコードブロックは内部の行数・セル数にかかわらず1ブロックとして数える。
    - 番号は各ブロックの先頭行の高さ位置に揃えて表示し、ブロックの追加・削除・移動時はリアルタイムに振り直す。
  - **キャレット行ハイライト**:
    - 行番号表示が有効な場合、キャレット（カーソル）が存在する行（ソースモード）またはブロック（WYSIWYGモード）の行番号を、文字色の強調（濃い色・太字）と薄い背景色の付与によりハイライト表示する。
    - 範囲選択時は、選択範囲のヘッド（キャレット側端点）がある行/ブロックをハイライト対象とする。
    - エディタからフォーカスが外れた状態でも、最後のキャレット位置のハイライトを維持する。
    - ハイライト色はライト/ダーク両テーマで視認性を確保した配色とし、テーマ切替に追従する。行番号機能として新たに本文の行全体の背景ハイライトは追加しない（WYSIWYGは行番号ガター部分のみハイライトし、ソースモードの既存の行ハイライト `.cm-activeLine` は維持する）。
  - **有効/無効の切り替え**:
    - **デフォルト**: 有効（表示）。
    - **OSネイティブメニュー**: 「表示」メニューに「行番号を表示」項目をチェック状態（✓）付きで配置し、現在の表示状態と双方向に同期する。メニュー選択時は `menu:toggle_line_numbers` イベントを `app.emit` で通知し、React側で `listen` してトグルする。フロントエンド側（ショートカット等）で状態を変更した場合も、メニューのチェック状態を更新する。
    - **ショートカット**: デフォルト `Ctrl + Alt + L`（macOS は `Cmd + Option + L`）。ショートカット設定画面（`ShortcutSettingsModal`）でカスタマイズ可能とし、`SHORTCUT_ITEMS` に登録して既存ショートカットとの競合検知の対象とする。ソース直接編集モード（CodeMirror）内でも確実に機能すること。
    - **チートシート**: `CheatSheetModal` のショートカット一覧に行番号表示切替を掲載し、カスタマイズ後のキーを動的に反映する。
  - **永続化**: 有効/無効状態は `localStorage`（キー例: `typori:line_numbers_enabled`）に保存し、次回起動時に復元する。保存値が存在しない場合はデフォルト（有効）とする。
  - **他機能との整合**:
    - WYSIWYG/ソースモード切替、タブ切替、ファイル切替（エディタ再マウント）後も、設定状態に従って行番号を表示する。
    - フォーカスモード有効時も行番号は表示し、キャレット行のハイライトはフォーカスモードの減光処理の影響を受けないこと。
    - 行番号ガターは本文テキストの選択・コピー対象に含めない（コピーしたテキストに番号が混入しない）。
    - 行番号の表示はエディタ上の表示のみであり、Markdownファイルの保存内容、HTML/PDFエクスポート結果には一切影響させない。
    - クイックアクションパレット・アウトラインサイドバー等の既存UIのレイアウトと重ならないこと。
  - **スコープ外**: Markdownソース行番号とWYSIWYGブロック番号の相互対応表示、コードブロック内部の個別行番号表示、行番号クリックによる行選択・ジャンプ機能は本フェーズでは実装しない。
  - **完成基準**:
    - メニュー・ショートカットの双方で行番号の表示/非表示が切り替わり、メニューのチェック状態が常に実際の状態と一致する。
    - 両モードでキャレット移動に追従して該当行番号がハイライトされる。
    - 再起動後に設定が復元される。
    - 自動検証スクリプトを `scripts/verify-all.mjs` に統合し、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過する。

- Mermaidダイアグラム機能仕様 (Phase 20):
  - **目的**: Markdown設計書や技術仕様書等の作成を強力に支援するため、Markdownコードブロック記法（```mermaid）による各種ダイアグラムのインライン描画、シームレスな編集、テーマ同期、エクスポート連携、およびチートシート参照を提供する。
  - **対応記法（Mermaid標準記法全般）**:
    - フローチャート (`graph TB`, `graph LR`, `flowchart TD` 等)
    - シーケンス図 (`sequenceDiagram`)
    - ER図 (`erDiagram`)
    - ガントチャート (`gantt`)
    - その他Mermaidがサポートする標準記法全般（クラス図 `classDiagram`、状態遷移図 `stateDiagram`、円グラフ `pie`、マインドマップ `mindmap`、Gitグラフ `gitGraph` 等）
  - **WYSIWYGモード（Milkdown / ProseMirror）での表示・編集体験**:
    - **Typoraライクなブロックインタラクション**:
      - **通常表示（プレビュー状態）**: ダイアグラムブロックが非アクティブ（カーソルや選択が外れている状態）のときは、パース・レンダリングされたSVGグラフィックスをエディタ内にインライン表示する。
      - **編集状態（ソース展開）**: ダイアグラムをクリックするかキャレットを進入させた際、ダイアグラムのMarkdownソースコード（```mermaid〜```）の編集エリアを展開し、キーボード入力でダイアグラム記述を直接編集可能とする。
      - **再レンダリング（確定）**: 編集エリアからフォーカスが外れた（ダイアグラム外をクリック、または別ブロックへキャレット移動）際、自動的にSVGグラフィックスを再生成してプレビュー状態へ復帰する。
    - **構文エラー耐性（Error Handling）**:
      - 記述途中の構文不備や文法エラーが発生した場合でも、エディタ全体やProseMirrorのクラッシュ・描画停止を防止する。
      - ダイアグラム領域内に控えめなエラーメッセージ（赤字・構文エラー表示）を表示し、ユーザーがソース編集を継続して修正できるようにする。
  - **ソース直接編集モード（CodeMirror 6）での挙動**:
    - 通常のMarkdownフェンスドコードブロック（```mermaid ... ```）として等幅フォントおよびMarkdownシンタックスで直接編集可能とし、モード切り替え時にもテキストが完全保持される。
  - **テーマ連動（ライト／ダークモード）**:
    - Typoriのグローバルテーマ（ライト／ダーク）の切り替えを検知し、Mermaidのレンダリング設定（ライト: `default`、ダーク: `dark`）を動的に切り替えてダイアグラムを再描画する。
    - **Tailwind CSS配色との調和**: Mermaid 初期化設定（`initMermaid` / `updateMermaidTheme`）において、ダークテーマ時は `#1f2937` (gray-800) 背景・`#f3f4f6` (gray-100) / `#e5e7eb` (gray-200) テキスト・`#3b82f6` (blue-500) アクセントカラー・`#4b5563` (gray-600) ボーダーカラーを `themeVariables` に適用し、ライトテーマ時は `#ffffff` 背景・`#1f2937` テキスト・`#3b82f6` アクセントカラーを設定。
    - **SVG固定背景透過最適化**: ダークモード時等にMermaidが生成するSVGルート要素に含まれる不要な固定白背景（`background-color: white` / `#ffffff`）を `transparent` に自動正規化し、エディタおよびダイアグラムコンテナと美しく融合させる。
    - **三重の動的連動・一括再描画機構**:
      1. **React Props 連動**: `App.tsx` から `TyporiEditor` へ `theme={resolvedTheme}` を渡し、`Editor.tsx` の `useEffect` で `rerenderAllMermaidDiagrams(theme)` を実行。
      2. **CustomEvent 通知**: `useTheme.ts` の `applyTheme` において `typori:theme-change` カスタムイベントを送出し、`ensureGlobalThemeObserver` で即座に検知して再描画。
      3. **DOM クラス監視**: `document.documentElement` の `class="dark"` 属性変化をモジュールレベルの `MutationObserver` でグローバル監視し、全 `activeMermaidViews` を対象にデバウンス付き一括再レンダリングを実行。
    - 非アクティブ時（プレビュー表示）はもちろん、アクティブ時（ソース展開編集時）においてもプレビュー領域のダイアグラムが最新テーマで即座に再描画される。
  - **エクスポート連携（HTML / PDF）**:
    - **HTMLエクスポート**:
      - エクスポートされたスタンドアロンHTMLファイル内でもMermaidダイアグラムが正常にSVG描画・表示されるようにする（レンダリング済みSVGの直接インライン展開、またはスタンドアロンHTML内でのMermaid描画スクリプト連携）。
    - **PDFエクスポート（印刷連携）**:
      - 印刷プレビュー用iframe内において、すべてのMermaidダイアグラムがSVGとして完全に描画完了したことを待機してから `window.print()` を呼び出すハンドシェイクを行い、PDF出力や印刷結果にダイアグラムが欠落なく含まれるようにする。
  - **チートシート（CheatSheetModal）連携**:
    - Markdown記法チートシート（`F1`キー）にMermaid記法の項目（または新規カテゴリ）を追加。
    - 代表的な4形式（`graph TB`, `sequenceDiagram`, `erDiagram`, `gantt`）の構文サンプルと説明を掲載し、ワンクリックでエディタにコピー＆ペースト可能なUIを提供する。
  - **完成基準**:
    - WYSIWYGモードで `erDiagram`, `sequenceDiagram`, `graph TB`, `gantt` 等のMermaidブロックがSVGとして正常描画され、クリックでソース編集、フォーカスアウトで再描画される。
    - テーマ切り替え（ライト/ダーク）時にダイアグラムの配色が追従する。
    - 構文エラー時にもエディタが壊れず、エラー通知が表示されて修正が可能。
    - HTMLエクスポート結果およびPDF印刷ダイアログ（iframe）でMermaidダイアグラムが描画・保持される。
    - チートシートにMermaid記法サンプルが掲載され、コピー可能である。
    - 自動検証スクリプトを整備し、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過する。

- 起動高速化・ホワイトブランク完全解消仕様 (Phase 21):
  - **目的**: Tauri（WebView2）起動時にOSネイティブウィンドウが先行表示されてからフロントエンド描画が完了するまでの間に発生する「ホワイトブランク（白画面フラッシュ・待ち時間）」を完全に解消し、初期起動時間（0.25〜0.4秒目標）と体感レスポンスを最大化する。
  - **1. ハイブリッド・ウィンドウ表示制御（初期非表示＋描画完了後即表示＋背景色/スケルトン同期）**:
    - **Tauriウィンドウ初期設定 (`src-tauri/tauri.conf.json`)**:
      - メインウィンドウ設定に `"visible": false` を設定し、WebView2プロセス初期化中の空ウィンドウ露出を防止する。
      - 同時に、万が一の描画前露出に備えてウィンドウの初期 `backgroundColor` を設定する。
    - **Tauri Capabilities権限追加 (`src-tauri/capabilities/default.json`)**:
      - フロントエンドからウィンドウの表示制御を安全に実行できるよう、`core:window:allow-show`（および必要に応じて `core:window:allow-set-focus`）権限を明示的に付与する。
    - **`index.html` での0msテーマ判定・インラインスケルトン適用**:
      - Reactバンドルの読み込みを待たず、`index.html` の `<head>` 内インラインスクリプトで `localStorage.getItem("typori-theme")` および `window.matchMedia("(prefers-color-scheme: dark)")` を同期的に評価し、`document.documentElement` に `dark` クラスと初期背景色（ライト: `#ffffff` / ダーク: `#111827`）を0msで適用する。
      - `#root` 内部またはインラインCSSに初期スケルトン（サイドバー枠・エディタ背景）を配置し、Reactマウントの瞬間まで一切の白フラッシュ（特にダークモード時の白発光）が発生しない構造とする。
    - **初回描画完了後の即時ウィンドウ表示とセーフティフォールバック (`src/App.tsx` / `src-tauri/src/lib.rs`)**:
      - フロントエンドの初回マウントおよび初期ワークスペース取得完了直後（`requestAnimationFrame` 等でDOM描画が確定したタイミング）に `getCurrentWindow().show()` を呼び出し、完成したUI状態でウィンドウをパッと表示する。
      - 万が一フロントエンド側の初期化エラーや遅延が発生した場合でもウィンドウが永久に非表示のままにならないよう、フロントエンドおよびRust側の双方にセーフティフォールバックタイマー（例: 最大300〜500ms経過で自動 `show()`）を設ける。
  - **2. フロントエンド初期バンドル軽量化・遅延読み込み（Code Splitting / Lazy Loading）**:
    - **動的インポートによる初期ロード最小化 (`src/App.tsx`, `src/components/Editor/Editor.tsx`)**:
      - 初期起動時（WYSIWYGモードかつモーダル非表示状態）に即座に必要としない以下の重いコンポーネント・ライブラリを `React.lazy()`（＋ `<Suspense>`）および動的 `import()` に分離する:
        - `SourceEditor`（CodeMirror 6 一式）
        - `CheatSheetModal`（チートシートモーダル）
        - `ShortcutSettingsModal`（ショートカット設定モーダル）
        - `ExportModal`（HTML/PDFエクスポートモーダル）
        - `Mermaid` ダイアグラムレンダラ（`mermaid` パッケージ本体はダイアグラムブロックが存在するとき、または初回レンダリング要求時に動的インポートする）
    - **Viteビルドチャンク最適化 (`vite.config.ts`)**:
      - `build.rollupOptions.output.manualChunks` 等を構成し、初期エントリチャンクの肥大化を防ぎ、WebView2での初回スクリプト解析・実行時間を短縮する。
  - **3. 起動時ワークスペース初期化IPCの一括化（Batch Workspace Initialization）**:
    - **Rust側一括初期化コマンド (`init_workspace`) の新設 (`src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`, `src/api/fs.ts`)**:
      - 従来 `App.tsx` の起動時 `useEffect` 内で直列に最大5往復していたIPC通信（`get_cli_args` → `get_parent_dir` → `get_current_dir` → `read_dir` → `open_file`）を、Rust内部で一括処理して1回のIPC往復で返却する `init_workspace` コマンドを追加する。
      - `init_workspace` の返却データ構造（`WorkspaceInitResult`）には、`current_dir: String`、`entries: Vec<FileEntry>`、`initial_file_path: Option<String>`、`initial_file_content: Option<String>`、`initial_file_error: Option<String>` を含める。
      - 既存の個別コマンド（`get_cli_args`, `get_current_dir`, `get_parent_dir`, `read_dir`, `open_file`）も後方互換および既存テスト維持のためそのまま保持する。
  - **完成基準**:
    - 起動時に白い空ウィンドウ（ホワイトブランク）が露出せず、ダークモード設定時にも白フラッシュが発生しないこと。
    - `CheatSheetModal`、`ShortcutSettingsModal`、`ExportModal`、`SourceEditor`、および `Mermaid` が遅延読み込み（チャンク分割）されていても、呼び出し時に従来通りすべて正常動作すること。
    - `init_workspace` コマンドにより初期ディレクトリツリーとCLI引数指定ファイルが1回のIPC呼び出しで正常にロードされること。
    - 自動検証スクリプトを `scripts/verify-all.mjs` に統合し、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過すること。

## パッケージング・配布仕様
- `pnpm tauri build` により、リリースビルドバイナリ (`typori.exe`) および各プラットフォーム向けインストーラパッケージ（Windows向け: NSIS `.exe` インストーラおよび WiX `.msi` パッケージ）を生成。
- バンドル生成先: `src-tauri/target/release/bundle/`
- アプリケーション固有アイコン: デフォルトのTauriアイコンから、Typori固有の独自アイコン（スカイブルー〜ミントグラデーション背景に白い角丸「T」モノグラムを配したMinimal Tデザイン）を採用。Tauri CLI (`pnpm tauri icon`) により全プラットフォーム向けマルチ解像度アセット（Windows `.ico`, macOS `.icns`, Linux/Web用各種PNG、タイル用画像一式）を生成・配置。

## セキュリティ強化・脆弱性対策仕様 (Phase 23: Security Hardening)
- **目的**: 悪意のあるMarkdownファイルや外部入力を開いた際に、WebView内でのStored XSS（クロスサイトスクリプティング）およびTauri IPCブリッジ（`window.__TAURI_INTERNALS__`）経由でのローカルファイル流出・任意操作（RCE相当）やDoS（サービス拒否）が発生することを多層防御（Defense-in-Depth）で防止する。
- **1. MermaidダイアグラムのXSS完全防止 (CRIT-01 / MED-03)**:
  - **Mermaid初期化設定の厳格化 (`src/utils/mermaid.ts`)**:
    - `securityLevel: "strict"` を設定し、図内のHTMLタグやクリックイベント（`click Node call ...` / `javascript:` URL）によるスクリプト実行を禁止する。
    - `secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize"]` を設定し、Markdown内の `%%{init: {'securityLevel': 'loose'}}%%` ディレクティブによるセキュリティ設定の動的オーバーライドを封じる。
  - **SVG出力のサニタイズ (`src/utils/mermaid.ts`, `src/components/Editor/mermaidPlugin.ts`, `src/utils/mermaidExport.ts`)**:
    - `renderMermaidDiagram` が返却するSVG文字列（およびDOM挿入直前）に対し、危険な要素（`<script>`, `<iframe>`, `<object>`, `<embed>`）やインラインイベントハンドラ属性（`onload`, `onerror`, `onclick` 等の `on*` 属性）、および `javascript:` / `vbscript:` / `data:text/html` スキームを含む属性を除去・無害化するサニタイズ関数（`sanitizeMermaidSvg`）を適用する。
    - `mermaidPlugin.ts` における `result.bindFunctions` の呼び出しを廃止し、任意のJavaScriptコールバックバインドを防止する。
    - `mermaidExport.ts` の正規表現フォールバック（`replaceMermaidRegex`）において、エラーメッセージ出力時に必ず `escapeHtml(errorMsg)` を適用する。
- **2. Content Security Policy (CSP) の有効化と外部URLスキーム検証 (HIGH-01 / MED-01)**:
  - **Tauri CSP設定 (`src-tauri/tauri.conf.json`)**:
    - `"csp": null`（無効状態）を廃止し、外部スクリプト読み込みや不正な外部通信、`object-src` を制限するCSPポリシーを設定する。
    - ローカルアセット（`'self'`, `asset:`, `http://asset.localhost`, `blob:`, `data:`, `https:`）、Tauri IPC通信（`ipc:`, `http://ipc.localhost`）、およびテーマ初期化・Tailwind/Milkdown/Mermaidのインラインスタイル・スクリプト動作を損なわないポリシーを構成する。
  - **外部リンク起動時のURLスキームホワイトリスト検証 (`src/components/Editor/Editor.tsx`, `src/components/Editor/LinkTooltip.tsx`)**:
    - `openUrl(url)` およびフォールバック `window.open` を呼び出す前に、URLスキーム検証ヘルパー（`isSafeExternalUrl`）を通し、`http:`、`https:`、`mailto:` スキームのみを許可する（`file:`, `javascript:`, `ms-msdt:`, カスタムURIスキーム等を拒否）。
    - `window.open` フォールバック時は `noopener,noreferrer` を指定する。
- **3. HTMLエクスポート・PDF印刷時のHTMLサニタイズとiframe隔離 (HIGH-02)**:
  - **Markdown→HTML変換時のサニタイズ (`src-tauri/src/fs.rs`)**:
    - `convert_markdown_to_html` において、`pulldown-cmark` が出力したHTMLボディから危険なタグ（`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>`, `<meta http-equiv=...>` 等）、インラインイベント属性（`on[a-z]+\s*=`）、および `href` / `src` / `xlink:href` / `action` 内の `javascript:` / `vbscript:` / `data:text/html` スキームを無害化するサニタイズ処理（`sanitize_exported_html`）を実装する。
    - GFM標準要素（見出し、強調、表、チェックボックス `<input type="checkbox" disabled>`、コードブロック、画像、安全なリンク）および `.typori-mermaid-svg` 等は完全に保持する。
  - **PDF印刷用iframeの保護 (`src/api/fs.ts`)**:
    - `printHtmlContent` で非表示 `iframe` にHTMLを書き込む際にもフロントエンド側で危険な `<script>` タグやイベントハンドラが含まれないことを保証し、親ウィンドウ（`window.parent.__TAURI_INTERNALS__`）へのアクセスを防止する。
- **4. バックエンドファイルシステムIPCの境界防御・DoS対策 (HIGH-03 / MED-02)**:
  - **画像保存時のパストラバーサル防止と拡張子検証 (`src-tauri/src/fs.rs`)**:
    - `get_unique_file_path` / `save_image_binary` / `save_image_file` において、受け取った `file_name` からディレクトリ成分（`../`, `/`, `\`）を除去しファイル名成分（`Path::new(&file_name).file_name()`）のみを抽出するとともに、`is_image_extension` により許可された画像拡張子（`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `ico`, `avif`）であることを検証する。
  - **画像パス解決とバイナリ読み込みの制限 (`src-tauri/src/fs.rs`)**:
    - `resolve_image_path` において、`..`（ParentDir）によるベースディレクトリ外への上位トラバーサルや非画像拡張子の指定を拒否する。
    - `read_file_binary` において、対象ファイルが許可された画像拡張子であることを検証し、かつファイルサイズ上限（`MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024` バイト = 50MB）を超える場合はエラーを返してOOM（メモリ枯渇）DoSおよび任意非画像ファイルの読み出しを防止する。
  - **ファイル検索の再帰深度制限とシンボリックリンク除外 (`src-tauri/src/fs.rs`)**:
    - `search_dir_recursive` において、最大再帰深度（`MAX_SEARCH_DEPTH = 16`）を設定し、シンボリックリンク（`ft.is_symlink()`）の追跡をスキップすることで、循環リンクや巨大ツリーによるスタックオーバーフロー・応答停止を防止する。
- **5. 依存パッケージの既知脆弱性解消 (LOW-01)**:
  - **`package.json` の `pnpm.overrides` 設定**:
    - 間接依存の `source-map-js`（`GHSA-68fv-2mgg-jv7q`: High）を `>=1.2.2`、`katex`（`GHSA-238p-pmpm-9mq7`: Low）を `>=0.18.2` にオーバーライド解決し、`pnpm audit` での検出脆弱性をゼロにする。
- **完成基準**:
  - 上記1〜5のセキュリティ対策がすべて実装され、既存の全機能（WYSIWYG編集、Mermaid描画・テーマ連動・エクスポート、画像D&D・クリップボード貼り付け・ローカル画像表示、HTML/PDFエクスポート、サイドバー検索）および既存テストが一切破壊されないこと。
  - セキュリティ強化項目を検証する自動テストスクリプト（`scripts/verify-security-hardening.mjs`）が `scripts/verify-all.mjs` に統合され、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過すること。

## ソース直接編集モード表示・レイアウト・構文ハイライト完全改善仕様 (Phase 24: Source Editor Display & Syntax Highlighting)
- **目的**:
  CodeMirror 6 を用いた Markdown ソース直接編集モードにおいて、Typora ライクな美しく集中できる等幅執筆環境を提供する。
  具体的には、行番号ガターと本文が分離して巨大な余白が生じるレイアウト不具合を解消し、GFM（GitHub Flavored Markdown）拡張構文および主要プログラミング言語のフェンスドコードブロック構文ハイライト（シンタックスハイライト）を実装するとともに、WYSIWYG モードとの双方向切り替え時における Ref 整合性・未保存（Dirty）判定・元ファイル生ソースの 100% 忠実な保護を確立する。
- **1. レイアウト・スタイル仕様 (`src/components/Editor/SourceEditor.tsx`)**:
  - **行番号ガターと本文の一体化レイアウト**:
    - `.cm-content` のみに `margin: 0 auto; max-width: 960px;` を適用すると、`.cm-gutters`（行番号ガター）がエディタ左端に固定され、本文との間に巨大な空白（分離）が生じる問題を解消する。
    - スクロールコンテナ（`.cm-scroller`）またはエディタ内部の共通ラッパー（`.cm-content` と `.cm-gutters`）に対し、ガターと本文が自然に一体化したまま中央配置される構造、またはフル幅で快適な余白（パディング: `padding: 24px 32px`）を持つ等幅エディタレイアウトを適用する。
    - 行番号ガター（`.cm-gutters`）の右ボーダー（`borderRight: 1px solid`）を行テキスト開始位置の直前に自然に配置し、視線移動負荷のない Typora ライクな等幅執筆体験を実現する。
  - **スクロール領域と高さ構造**:
    - 親要素 `flex-1 w-full h-full overflow-hidden` と CodeMirror 本体の `height="100%"`、`.cm-scroller` の `overflow: auto` の構造を最適化し、不要なスクロールバー二重化やはみ出しを完全排除する。
    - ドキュメント末尾の快適な執筆余白（`paddingBottom: 120px`）を維持し、最下行でも画面最下部に張り付かずに編集可能とする。
  - **Typori 調和シンタックスハイライトテーマ**:
    - アプリケーションのライト／ダークテーマ（Tailwind CSS / Zinc 配色）と完全に調和するカスタムテーマを整備する。
    - ライトテーマ: 背景白（`#ffffff`）、本文濃灰（`#27272a`）、見出し（`#09090b`、太字）、コードブロック背景（`#f4f4f5`）、インラインコード（`#0284c7`）、リンク（`#4f46e5`）、キーワード（`#7c3aed`）、文字列（`#059669`）、コメント（`#71717a`）。
    - ダークテーマ: 背景深黒（`#18181b`）、本文明灰（`#f4f4f5`）、見出し（`#fafafa`、太字）、コードブロック背景（`#27272a`）、インラインコード（`#38bdf8`）、リンク（`#818cf8`）、キーワード（`#a78bfa`）、文字列（`#34d399`）、コメント（`#a1a1aa`）。
    - アクティブ行・アクティブ行番号のハイライト（Indigo 系）および選択マッチハイライトを維持する。
- **2. GFM 構文拡張 & コードブロック言語ハイライト仕様 (`SourceEditor.tsx`)**:
  - **GFM（GitHub Flavored Markdown）拡張**:
    - `@codemirror/lang-markdown` の `markdown()` 初期化において、GFM 拡張（Markdown Table、Task List、Strikethrough、Autolink）を有効化する。
    - テーブルのパイプ区切りやヘッダーアラインメント、`- [ ]` / `- [x]` のタスクリスト、`~~打消し線~~`、URL 自動リンクが正しくトークン認識され、スタイル適用されること。
  - **主要プログラミング言語の構文ハイライト**:
    - `@codemirror/language-data`（主要言語パーサー定義集）を導入し、`markdown({ codeLanguages: languages })` を設定する。
    - 対象言語: JavaScript (`javascript`, `js`), TypeScript (`typescript`, `ts`, `tsx`, `jsx`), Python (`python`, `py`), Rust (`rust`, `rs`), HTML (`html`), CSS (`css`), JSON (`json`), Markdown (`markdown`, `md`), YAML (`yaml`), Shell/Bash (`bash`, `sh`), SQL (`sql`) 等。
    - フェンスドコードブロック（````js ... ```` 等）の内部コードが指定言語の構文規則に従ってキーワード、文字列、コメント、数値等に色分け表示されること。
- **3. 双方向コンテンツ同期 & モード切替の堅牢化仕様 (`src/App.tsx`)**:
  - **`isSourceModeRef` 同期漏れの解消**:
    - `SourceEditor` の `onExitSourceMode` コールバックにおいて、単に `setIsSourceMode(false)` を呼ぶだけでなく、`isSourceModeRef.current = false` を確実に同期更新する。
    - ヘッダーボタン、ショートカット（Ctrl+/）、OS ネイティブメニュー（`menu:toggle_source_mode`）、およびエディタバナーボタンのすべての切り替え経路で Ref と State が完全に同期すること。
  - **元ファイル生ソース優先維持 & 未保存判定（Dirty）保護**:
    - ソース直接編集モードで保存（Ctrl+S / 保存ボタン）を行った場合、ProseMirror / Milkdown のシリアライザを介さず、ユーザーが入力したプレーンテキスト（改行コード LF 正規化後）をそのままディスクに書き込むことで、元ファイル固有の Markdown 書式・インデント・コメント・インライン HTML 等を 100% 忠実に保護する。
    - WYSIWYG モードと直接編集モードを相互に切り替える際、未保存フラグ（`isDirty`）やバッファ（`fileContentRef.current`）が不正にリセットされたり上書きされたりしないハンドシェイクを確立する。
  - **エディタ間でのカーソル・スクロール位置の破棄防止**:
    - モード切り替え時にテキストが消失しないことはもちろん、可能な限り不自然なスクロール跳躍を防ぐ。
- **4. 完成基準**:
  - ソース直接編集モードにおいて、行番号ガターと本文が自然に一体化して表示され、左右に不自然な巨大空白が生じないこと。
  - フェンスドコードブロック（js, ts, py, rust, json等）およびGFM記法（テーブル、打消し線、タスクリスト）が美しく構文ハイライト表示されること。
  - WYSIWYGモードとソース直接編集モードの切り替え（Ctrl+/、ツールバーボタン、ヘッダーボタン、ネイティブメニュー）において、`isSourceModeRef` が完全に同期し、未保存ステータスとコンテンツが100%保持されること。
  - 自動検証スクリプト（`scripts/verify-source-editor-display.mjs`）が作成され、総合結合テストスイート（`scripts/verify-all.mjs`）に統合されて `pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 でパスすること。

- 大容量ファイル（800KB/5000行+）オープン高速化とパフォーマンス最適化仕様 (Phase 25: Performance & Large File Optimization):
  - **背景と課題**:
    - 通常サイズ（数十KB〜数百行程度）のドキュメントでは快適に動作する一方、5000行・800KB超の大規模仕様書やログ・技術ノート等の大容量 Markdown ファイルを開いた際に、以下のボトルネックにより数秒間の UI フリーズ（メインスレッドブロッキング）やスクロールのもたつきが発生していた:
      1. WYSIWYG モード（Milkdown）の `lineNumbersPlugin` が、ドキュメント内の全ブロック（数千ノード）に対して `view.coordsAtPos(pos)` を同期的ループで呼び出し、ブラウザの強制レイアウト再計算（Forced Reflow / Layout Thrashing）を連続して引き起こしていた。
      2. Milkdown のマウント完了時（`listenerCtx.mounted`）に、初期コンテンツの不要な全件シリアライズ（`getMarkdown()`）が同期実行され、巨大ドキュメントの文字列化でメインスレッドが占有されていた。
      3. 右サイドバーのアウトライン（見出し抽出）やローカル画像パス解決（`resolveImagesInDOM`）、Mermaid ダイアグラムの探索処理がファイルオープン直後に一斉に同期実行されていた。
  - **1. パフォーマンス目標・要件**:
    - **ファイルオープン時間目標**: 800KB / 5000行+ の大容量 Markdown ファイルにおいて、オープン処理開始からエディタ操作可能になるまでの時間を大幅短縮（フリーズ時間 0.5秒以内、CodeMirror 仮想スクロール時は即時体感レスポンス）。
    - **Forced Reflow の完全排除**: 描画更新処理（ガター行番号更新等）において、全ブロック走査による同期レイアウト読み取りを廃止し、レンダリングフレーム（16.6ms / 60fps）を阻害しないこと。
  - **2. WYSIWYG 行番号ガターのビューポート仮想化 (Virtualization)**:
    - **可視領域限定計算**: エディタのスクロール位置（`scrollTop`）およびビューポート高さ（`clientHeight`）を取得し、画面内に可視なブロックノード（および上下一定のバッファ範囲、例: 画面外 上下 200px）のみを探索・座標計算の対象とする。
    - **二分探索 / 近傍推定によるノード特定**: ドキュメント全体（数千ブロック）を先頭から全件ループ走査するのではなく、スクロール量に応じた概算位置から近傍の可視ブロックを効率的に特定する。
    - **`requestAnimationFrame` による更新デバウンス**: スクロールイベントごとに即時同期実行せず、`requestAnimationFrame` で最新フレームに集約してガター DOM の座標・テキストを更新する。
  - **3. 初回マウント時シリアライズ最適化**:
    - ファイルオープン直後において、すでにディスク読み込み時の生コンテンツ（LF正規化済み）が `savedContentRef` に保持されているため、`mounted` フックでの不要な全件シリアライズを抑制する。
    - ユーザーによる明示的な編集（キーストローク・コマンド）が発生して初めてシリアライズ・差分検知を行うよう遅延・最適化する。
  - **4. 大容量ファイル検知と高速オープンモード連携 (Smart Large-File Handler)**:
    - **閾値判定**: ファイル読み込み時にコンテンツサイズ（300KB 以上 または 2000行以上等）を検知。
    - **CodeMirror 6 の仮想スクロール特性の活用**: CodeMirror 6 はデフォルトで強力なビューポート仮想化（画面外行の DOM を生成しない）を備えているため、大容量ファイルに対しても極めて軽量に即時オープン可能。大容量ファイルオープン時は直接編集モードへの高速オープン連携やスムーズな編集切替をサポートする。
  - **5. アウトライン・画像・Mermaid の遅延ロード最適化**:
    - **アウトライン抽出**: `OutlineSidebar` での見出しパース・抽出処理にデバウンス（150ms〜200ms）を適用し、オープン直後の競合負荷を低減。
    - **ローカル画像パス解決**: DOM 全体の走査をビューポート近傍に限定するか、アイドル時（`requestIdleCallback` 等）に段階的に実行。
    - **Mermaid ダイアグラム**: 可視領域外のダイアグラムは初期レンダリングを保留し、IntersectionObserver 等によるビューポート接近時の遅延描画（Lazy Render）を可能とする。
  - **6. 完成基準**:
    - 800KB / 5000行以上の模擬 Markdown ファイルをロードした際、UI の長期フリーズが発生せず、スクロールおよび入力が軽快に行えること。
    - WYSIWYG モードの行番号ガターが可視領域のみを仮想化描画し、全ブロックの Forced Reflow が発生しないこと。
    - 総合結合テストスイート（`scripts/verify-all.mjs`）にパフォーマンステスト（`scripts/verify-large-file-performance.mjs`）が統合され、全テスト・ビルド・Rust単体テストが Exit Code 0 でパスすること。

- 書式クリア機能仕様 (Phase 26: Clear Formatting / Bare):
  - **目的**: 太字・イタリック・打ち消し線・インラインコード・リンク等、始まりと終わりがある記法（デリミタ囲み記法）が適用されている文字列の一部分または全体を選択した際に、装飾を解除して素のテキスト（Bare）に戻す機能を提供する。
  - **対象記法（始まりと終わりのあるインライン記法全般）**:
    - 太字 (`**テキスト**` / `__テキスト__`)
    - イタリック・斜体 (`*テキスト*` / `_テキスト_`)
    - 打ち消し線 (`~~テキスト~~`)
    - インラインコード (`` `テキスト` ``)
    - リンク (`[表示テキスト](URL)`): 選択範囲に含まれる場合、リンク記法も解除して素の `表示テキスト` に戻す。
    - 複合装飾・ネスト (`***テキスト***`, `**~~テキスト~~**` 等)
  - **エディタモード別の動作仕様**:
    1. **WYSIWYGモード（Milkdown / ProseMirror）**:
       - 選択範囲（Selection）に対し、ProseMirror の `tr.removeMark(from, to)` を実行して対象範囲のすべてのインラインMark（太字、イタリック、打ち消し線、コード、リンク等）を一括解除する。
       - Milkdown のシリアライザにより、Markdown への変換・保存時に選択部分の前後の装飾が自動的に分離・整形される（例: `**太文字の**選択テキスト**を解除**`）。
    2. **ソース直接編集モード（CodeMirror 6）**:
       - 選択範囲およびその周辺テキストのデリミタ構文を解析し、選択部分を除外するように自動分割・整形置換する:
         - **中間部分の選択**: `**前[中]後**` → `**前**中**後**`
         - **先頭または末尾を含む選択**: `**[前]後**` → `前**後**`、`**前[後]**` → `**前**後`
         - **装飾全体の選択**: `**[全体]**` → `全体`
         - **複合装飾・ネスト**: `***前[中]後***` → `***前***中***後***`
         - **複数装飾を含む広い範囲の選択**: `前[ **太字** 中 *斜体* ]後` → `前 太字 中 斜体 後`（選択範囲内の装飾記号を一括除去）
    3. **選択範囲なし（カーソルのみ）の挙動**:
       - 誤操作防止のため、1文字以上のテキスト選択が存在する場合のみ実行し、選択範囲がない（Collapsed Selection）場合は何もしない（no-op）。
  - **UI / 各種アクセス手段との連携**:
    - **表示名**: 「書式をクリア」
    - **アクションID**: `clear_formatting`
    - **デフォルトショートカット**: `Ctrl + Shift + B` (macOS: `Cmd + Shift + B`)
    - **OSネイティブメニュー**: 「編集」メニューに「書式をクリア (CmdOrCtrl+Shift+B)」項目を追加。メニュー選択時は `menu:clear_formatting` イベントを通知し、フロントエンド側で購読・実行する。
    - **エディタツールバー（EditorToolbar）**: クイックアクションパレットに「書式をクリア」ボタン（フォントクリア・消しゴム等のアイコン）を配置し、クリックで選択テキストの書式をクリアする。
    - **ショートカット設定モーダル（ShortcutSettingsModal）**: 「書式・挿入」カテゴリに `clear_formatting` を追加し、ユーザーによるキーバインドのカスタマイズおよび重複・競合検知に対応する。
    - **チートシートモーダル（CheatSheetModal）**: F1モーダルのショートカット一覧に「書式をクリア (`Ctrl+Shift+B`)」を掲載する。
  - **完成基準**:
    - WYSIWYGモードで装飾テキストの一部分を選択して `Ctrl+Shift+B`（またはメニュー・ツールバーボタン）を実行すると、該当部分のみ装飾が解除され、保存/シリアライズ時に適切にMarkdownが分割されること。
    - ソース直接編集モードで装飾テキストの一部分を選択して実行すると、前後のデリミタが自動分割・整形されること。
    - 選択範囲がない（カーソルのみの）場合は何も実行されないこと。
    - ショートカットのカスタマイズ、ネイティブメニュー連携、ツールバーボタン、チートシートへの掲載がすべて連動すること。
    - 自動検証スクリプトを `scripts/verify-all.mjs` に統合し、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過すること。

- ソース直接編集モードのインデント・レイアウト最適化および行番号・スクロール不具合完全解消仕様 (Phase 28: Source Editor Indentation, Layout & Menu Sync):
  - **背景と課題**:
    - ソース直接編集モード（CodeMirror 6）において、以下の3つの不具合・課題が確認されていた:
      1. **レイアウトとスクロールの不具合（問題点A & B）**:
         - 行番号表示をOFFにした際や特定のウィンドウ幅において、`.cm-content` の幅が潰れたり折り返しが崩れる（問題点A）。
         - 長文Markdownドキュメント編集時に、`.cm-scroller` が親要素の高さを突き抜けたり、スクロールバーが表示されず最下部までスクロールできない（問題点B）。
      2. **OSネイティブメニューのチェック状態同期不具合（問題点C）**:
         - 表示メニューの「行番号を表示」のチェック状態同期（`set_line_numbers_menu_checked`）において、トップレベルの `menu.get("toggle_line_numbers")` では Submenu（「表示」メニュー）配下にネストされたアイテムを取得できず、チェック同期が反映されない（問題点C）。
      3. **インデント操作・描画・全体レイアウトの課題（課題1, 2, 3）**:
         - **課題1（全体レイアウト）**: ソース直接編集モードが画面全体に横長に広がり、Typoraライクな中央寄せ・快適な左右余白となっていない。また単純に `.cm-content` を中央寄せするとガターと本文が分離してしまう。
         - **課題2（Tabキーインデント）**: CodeMirror 6 のキーマップに `indentWithTab` が登録されていないため、Tab キー押下時にインデント挿入ではなくエディタからフォーカスが外れてしまう。
         - **課題3（行頭空白・ネストリスト描画）**: 行頭スペース（2スペース、4スペース等）によるネストリストやコードブロックのインデントが正確に描画されず、視覚的に崩れる。
  - **1. ソース直接編集モードのレイアウト設計（課題1）**:
    - **中央寄せコンテナ配置**:
      - Typoraライクな最大幅（`max-width: 900px; margin: 0 auto;`）のレイアウトを採用し、広画面でも視線移動が自然な快適な等幅エディタ体験を実現する。
      - ガター（`.cm-gutters`）と本文（`.cm-content`）が分離せず一体となって中央に配置される構造を確立する。
    - **自然な左右余白**:
      - 画面端にテキストが張り付かないよう、十分な左右パディングを確保する。
  - **2. Flexbox幅・縦スクロール健全化仕様（問題点A & B）**:
    - **幅潰れ解消（問題点A）**:
      - `.cm-content` に対し `min-width: 0`, `flex-grow: 1`, `width: 100%` を設定し、行番号ガターの表示/非表示（ON/OFF）切り替えやウィンドウリサイズ時でも本文幅が潰れず、常に利用可能なコンテナ幅一杯にフィットして自然に折り返されるようにする。
    - **縦スクロール健全化（問題点B）**:
      - `.cm-scroller` に対し `height: 100%`, `max-height: 100%`, `overflow-y: auto`, `box-sizing: border-box` を厳格に適用し、CodeMirror の仮想スクロールコンテナが親要素の高さを超過して突き抜けるのを確実に防止し、スムーズな縦スクロールバー操作を可能とする。
  - **3. インデント操作・描画仕様（課題2 & 3）**:
    - **Tab / Shift+Tab キー操作（課題2）**:
      - `@codemirror/commands` より `indentWithTab` を導入し、エディタのキーマップ拡張（`extensions`）に登録する。
      - これにより、Tab キー押下時にエディタからフォーカスが抜けることなく、キャレット位置や複数行選択範囲に対して適切なインデント（2スペースまたはタブ）を挿入し、Shift+Tab でアンインデント（逆インデント）を実行可能とする。
    - **行頭空白・ネストリスト描画保証（課題3）**:
      - `.cm-content` および `.cm-line` において `white-space: break-spaces`（または `pre-wrap`）を保証し、行頭の連続空白（2スペース、4スペース等）がHTMLの空白縮約によって潰れるのを完全に防ぐ。
      - ネストされた箇条書きリスト（`- 親` / `  - 子` / `    - 孫`）や連番リストが等幅フォントと調和して正確に階層表示されること。
  - **4. OSネイティブメニューチェック状態再帰同期仕様（問題点C）**:
    - **再帰探索ヘルパー（`find_check_menu_item`）**:
      - `src-tauri/src/menu.rs` において、`Menu` および `Submenu` の子アイテム一覧（`items()`）を再帰走査し、`MenuItemKind::Submenu` を見つけた場合はその内部を再帰探索して、指定された ID を持つ `CheckMenuItem` を確実に特定する関数を実装する。
      - これにより、Tauri v2 のメニュー構造において「表示」メニュー等のサブメニュー階層下に配置された `CheckMenuItem`（`toggle_line_numbers` 等）を漏れなく取得可能とする。
    - **チェック状態同期コマンド改修（`set_line_numbers_menu_checked`）**:
      - 再帰探索ヘルパーを利用して `toggle_line_numbers` の `CheckMenuItem` を取得し、`check_item.set_checked(checked)` を実行する。
      - Rust バックエンド単体テストを追加し、Submenu 内の CheckMenuItem に対する再帰検索およびチェック状態更新が確実に動作することを検証・保証する。
  - **5. 完成基準**:
    - ソース直接編集モードで中央寄せ最大幅コンテナ（max-width: 900px）が適用され、行番号ガターと本文が一体となって配置されること。
    - 行番号表示をOFFにしても本文の幅が潰れず、長文ドキュメントでスムーズな縦スクロールが機能すること。
    - Tab / Shift+Tab キーでエディタのフォーカスが外れず、単一行・複数行のインデント・アンインデントが軽快に操作できること。
    - ネストされたリスト等の行頭空白が正しくレンダリングされること。
    - OSネイティブメニューの「表示」>「行番号を表示」のチェック状態が、フロントエンドの行番号表示設定と完全に同期すること。
    - 自動検証スクリプト（`scripts/verify-source-editor-indent-and-scroll.mjs`）が作成され、総合結合テストスイート（`scripts/verify-all.mjs`）に統合されて `pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 でパスすること。

- ソース直接編集モードの行番号縦積み崩壊・スクロール不能の完全解消および生ソースインデント・レイアウトの抜本的健全化仕様 (Phase 30):
  - **背景・目的**:
    ソース直接編集モード（CodeMirror 6）において、行番号ガター（`.cm-gutters`）と本文（`.cm-content`）が縦積みに崩壊する現象（ガター縦落ち）、長文ドキュメントにおいて縦スクロールが正常に動作しない現象、および未編集のMarkdownファイルを開いた際にMilkdownのマウント時シリアライズによって生ソースのインデントや記法が不可逆的に破壊される重大な問題を抜本的に解消する。
  - **1. 問題点1: 行番号ガター縦落ちの根本原因分析と抜本的対策**:
    - **根本原因**:
      CodeMirror 6 において `.cm-scroller` は `.cm-gutters` と `.cm-content` を横並び（row）で内包する Flexbox コンテナとして設計されている。しかし Phase 28 において幅潰れ防止として `.cm-content` に `width: 100%` を付与したことにより、`.cm-gutters`（幅約50px）と `.cm-content`（幅100%）の合計幅がスクロールコンテナ幅を超過。コンテナの flex 計算によって `.cm-content` が `.cm-gutters` の下部に押し出されて縦落ち（縦積み崩壊）が発生していた。
    - **抜本的対策設計**:
      - `SourceEditor.tsx` の `customTheme` において、`.cm-content` から `width: 100%` を完全に撤廃する。
      - `.cm-scroller` に対し `display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: flex-start !important;` を明示する。
      - `.cm-content` は `min-width: 0; flex-grow: 1; flex-shrink: 1;` として CodeMirror 6 の自然な等幅 Flexbox 計算に委ね、行番号ガター（`.cm-gutters`）と本文（`.cm-content`）の確実な横並び・一体化配置を確立する。
  - **2. 問題点2: 過剰スタイルによる縦スクロール不能の根本原因分析と抜本的対策**:
    - **根本原因**:
      `.cm-scroller` に対し `max-height: 100%`, `min-height: 100%`, `overflow: auto`, `overflow-y: auto` などの過剰かつ競合する制約を重ねて指定したことにより、CodeMirror 6 の内部仮想スクロール（`view.measure()` / `scrollDOM`）の高さ測定 pass と干渉し、スクロールバーのドラッグやマウスホイールによる長文縦スクロールが正常に機能しなくなっていた。
    - **抜本的対策設計**:
      - `.cm-scroller` から `max-height: 100%` などの過剰プロパティを完全排除し、CodeMirror 6 標準の仮想スクロール（`height: 100%; overflow: auto; box-sizing: border-box;`）構成へ是正する。
      - 親要素（`.flex-1 min-h-0`）との高さ連動を健全化し、長文ドキュメントにおいてマウスホイール・スクロールバーによる滑らかな縦スクロールを完全に復旧する。
  - **3. 問題点3: Milkdown マウント時シリアライズによる生ソース（インデント）破壊の根本原因分析と抜本的対策**:
    - **根本原因**:
      1. `Editor.tsx` の `listenerCtx.mounted` において、無編集のクリーンなファイルであっても Milkdown の `serializer`（`mdast-util-to-markdown`）を実行し、その結果を `onChange(initialSerialized, { isUserInteraction: false })` で通知していた。
      2. `App.tsx` の `handleContentChange` において、クリーンな状態のタブの場合に `fileContentRef.current` および `savedContentRef.current` を `initialSerialized` で無条件に上書きしていた。これにより、ディスクから読み込まれた生 Markdown（2スペース/4スペースのネストリストインデントや整形済みテキスト）が、ユーザーが一切編集していないにもかかわらず Milkdown のシリアライザ出力によってメモリ上で不可逆的に変形・上書きされていた。
      3. さらに `Editor.tsx` の `remarkStringifyOptionsCtx` において、ネストされた箇条書きリスト（`- 親\n  - 子`）や連番リストのインデント設定（`listItemIndent: "one"` / `tabWidth`）がデフォルト挙動に依存しており、シリアライズ時にインデント幅が変動する原因となっていた。
    - **抜本的対策設計**:
      - **生ソース 100% 完全保護（Raw Markdown Preservation）**: 未編集（クリーン）なファイルにおいて、Milkdown マウント時シリアライズによる `fileContentRef.current` および `savedContentRef.current` の自動上書きを禁止。ディスクから読み込んだ生の生Markdownテキストを基準値として厳格に保持し、未編集のまま直接編集モードに切り替えた場合や保存した場合に、元のインデント・改行・記法が1文字たりとも損なわれないことを保証する。
      - **ネストリストのインデント保持**: `Editor.tsx` の Markdown シリアライザ（`remarkStringifyOptionsCtx`）において、ネストされたリスト項目のインデントを正確に維持する設定・ハンドラーを是正する。
      - **Tab / Shift+Tab キー操作と行頭空白描画の完全保証**: `SourceEditor.tsx` において `indentWithTab`（`Prec.highest`）による Tab / Shift+Tab 操作、および `white-space: break-spaces` による連続空白の描画保持を堅持する。
  - **4. 実証的自動テスト構築・総合品質保証**:
    - 単なるソースコードの文字列一致検査（`includes` 等）にとどまらず、実際の CSS プロパティ（`display: flex`, `flex-direction: row`, `width: 100%` 排除, `height: 100%`, `overflow: auto`）、Markdown AST のパース＆シリアライズによるネストインデント保持、および直接編集モード切り替え時の生ソース保護を実証的に検証するテストスクリプト（`scripts/verify-source-editor-layout-and-indent.mjs`）を作成し、`scripts/verify-all.mjs` に統合する。
  - **5. 完成基準**:
    - ソース直接編集モードにおいて行番号ガター（`.cm-gutters`）と本文（`.cm-content`）が確実に横並び（row）で一体配置され、縦落ちが完全に解消されること。
    - 長文編集時に CodeMirror 6 標準の仮想スクロールが健全に機能し、マウスホイールおよびスクロールバーによる滑らかな縦スクロールが動作すること。
    - 未編集のファイルを開いてソース直接編集モードに切り替えても、元の生ソースのインデント・空行・書式が1文字の欠損もなく100%完全に保護されること。
    - 実証的自動テストスクリプト（`scripts/verify-source-editor-layout-and-indent.mjs`）が `scripts/verify-all.mjs` に統合され、`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy` がすべて Exit Code 0 で通過すること。

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
- 2026-10-03: 品質保証: 全4項目（ウィンドウクローズ未保存警告、改行コードLF正規化&未保存誤爆防止、タブ切替Ref即時同期&未保存状態独立性、ソース直接編集Ctrl+/競合解消）を網羅検証する自動テストスイート（scripts/verify-source-comment-toggle.mjs, scripts/verify-phase16-fixes.mjs）の整備と総合ビルド検証（全27個別テスト、pnpm test / pnpm run build / cargo test / cargo check / cargo clippy の全パス）を追記
- 2026-10-03: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜16、全49タスク）の突き合わせ、エッジケースの点検、バックエンド単体テスト（24件）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全27個別テスト、IPC 14コマンド、ネイティブメニュー 16イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・更新。
- 2026-10-04: ウィンドウクローズ制御（Rust側 CloseRequested インターセプト）、ファイルオープン直後の未保存誤爆防止（ユーザー操作前イベントガード/初期シリアライズ同期）、および単一ファイル切替時の未保存ステータス破棄の仕様策定（Phase 17）を追記。
- 2026-10-04: Phase 17（タスク50〜54）実装および品質保証の完了。Rustネイティブでのクローズ一時保留（api.prevent_close()）とフロント通知、Milkdown初回シリアライズ差異誤爆防止とベースライン同期、単一ファイルモード切替時の未保存ステータス先行破棄とクリーン同期を実装し、総合テストスイート（scripts/verify-single-file-clean-reset.mjs, scripts/verify-phase17-fixes.mjs）の全自動検証パス（全31個別テスト、pnpm test / pnpm run build / cargo test / cargo check / cargo clippy のExit Code 0）を確認。
- 2026-10-04: アプリケーション固有アイコン（新案1「Minimal T」: スカイブルー〜ミントグラデーション背景＋白い角丸Tモノグラム）の採用および全プラットフォーム向けアセット生成・配置仕様を追記。
- 2026-10-04: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜17、全54タスク＋アプリアイコン刷新）の突き合わせ、エッジケースの点検、バックエンド単体テスト（24件）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全31個別テスト、IPC 14コマンド、ネイティブメニュー 16イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・更新。
- 2026-10-04: タブ切り替え時の未保存マーク消失バグおよび未保存タブクローズ警告スキップの根本原因整理、および未保存保護仕様（エディタ再マウント時初回シリアライズガード・savedContent保護・タブクローズ警告保護、Phase 18）を追記。
- 2026-10-04: Phase 18（タスク55〜58）実装および品質保証の完了。タブ有効時における未保存マーク保持（エディタ再マウント時初回シリアライズガード・savedContent保護）、タブクローズ時保存確認ダイアログ（window.confirm）発火保護、および網羅検証テストスクリプト（scripts/verify-tab-switch-dirty-retention.mjs）の総合結合テスト（pnpm test: 全32個別テスト）への統合と全検証コマンド（pnpm test / pnpm run build / cargo test / cargo clippy: Exit Code 0）のパスを確認。
- 2026-10-04: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜18、全58タスク＋アプリアイコン刷新）の突き合わせ、エッジケースの点検、バックエンド単体テスト（24件）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全32個別テスト、IPC 14コマンド、ネイティブメニュー 16イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・更新。
- 2026-10-06: 全体レビュー（/review）を実施。全自動検証（cargo test 24件 / cargo clippy -D warnings / pnpm run build / verify-all.mjs 全32件）のパスを確認。仕様書の記述ずれを修正（総合テスト件数 27→32、onCloseRequested が Rust 側インターセプトのフォールバックとして併存し `isHandlingClose` で排他されている旨を明記）。改訂履歴の不要な空行を除去。
- 2026-10-17: 行番号表示機能の仕様（Phase 19）を追記。ソース直接編集モードは物理行単位・WYSIWYGモードは最小ブロック単位での番号表示、キャレット行番号のハイライト（強調文字＋薄い背景）、表示メニューのチェック付き切替（menu:toggle_line_numbers）、ショートカット Ctrl+Alt+L（カスタマイズ可・チートシート掲載）、localStorage 永続化、デフォルト有効、スコープ外・完成基準を定義。
- 2026-10-17: Mermaidダイアグラム機能仕様（Phase 20）を追記。erDiagram, sequenceDiagram, graph TB, gantt を含むMermaid標準記法全般のサポート、Typoraライクなインラインプレビュー＆クリック編集、構文エラー耐性、ライト/ダークテーマ連動、HTML/PDFエクスポート出力連携、チートシートへの記法サンプル掲載、完成基準を定義。
- 2026-10-17: Phase 19（タスク59〜64）実装および品質保証の完了。行番号表示設定フック（useLineNumberSettings, localStorage永続化）、ショートカット（Ctrl+Alt+L）、表示メニューのチェック付き切替（CheckMenuItem / set_line_numbers_menu_checked）、ソース直接編集モード（lineNumbers / highlightActiveLineGutter）、WYSIWYGモード（ブロック単位行番号オーバーレイガター / キャレットブロックハイライト / フォーカスモード連動）の実装、網羅検証スクリプト（scripts/verify-line-numbers.mjs）の整備、総合結合テスト（scripts/verify-all.mjs: 全33個別テスト、IPC 14コマンド＋menu 1コマンド、OSメニュー 17イベント）への統合、および全検証コマンド（pnpm test / pnpm run build / cargo test / cargo clippy: Exit Code 0）のパスを確認。
- 2026-10-17: Mermaidチートシート連携（タスク66）の実装および品質保証の完了。CheatSheetModal/data.ts に Mermaid図カテゴリ（`mermaid`）と代表的4形式（`graph TB`, `sequenceDiagram`, `erDiagram`, `gantt`）の構文サンプル・説明を追加、CheatSheetModal UIの縦スクロール最適化（`max-h-48 overflow-y-auto`）、および `scripts/verify-cheatsheet.mjs` での自動検証アサーション拡充と全テスト合格を確認。
- 2026-10-17: WYSIWYGモード Mermaid ノードビュー・プラグイン（タスク67）の実装および品質保証の完了。`src/components/Editor/mermaidPlugin.ts`（`MermaidNodeView`, `mermaidPlugin`）を実装し、```mermaid コードブロックを自動検知してインライン SVG プレビュー表示・クリックによるキャレット移動＆ソース展開（Typoraライク体験）・構文エラー耐性表示（typori-mermaid-error）・ProseMirror ライフサイクル保護（ignoreMutation / stopEvent / destroy）・テーマ切り替え連動（MutationObserver）を実装。`Editor.tsx` の Milkdown プラグインチェーンに統合し、自動検証テスト（`scripts/verify-mermaid-wysiwyg.mjs`）を作成して総合結合テスト（`scripts/verify-all.mjs`: 全35個別テスト）へ統合。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-17: Mermaidテーマ連動・動的再レンダリング処理（タスク68）の実装および品質保証の完了。Mermaid初期化（`initMermaid` / `updateMermaidTheme`）におけるTailwind調和配色設定（`themeVariables`）、SVG固定白背景の自動透過正規化、グローバルテーマ監視・一括再描画関数（`rerenderAllMermaidDiagrams`）、`useTheme.ts` での `typori:theme-change` イベント発火、`App.tsx` から `TyporiEditor` への `theme={resolvedTheme}` 伝達と `Editor.tsx` の `useEffect` 連動による三重の動的テーマ追従機構を実装。自動検証スクリプト（`scripts/verify-mermaid-theme.mjs`）を作成し、総合結合テスト（`scripts/verify-all.mjs`: 全36個別テスト）へ統合。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo check`: Exit Code 0）のパスを確認。
- 2026-10-17: Mermaidエクスポート連携（HTML/PDF印刷）の実装および品質保証の完了（タスク69）。HTMLエクスポートにおいて `renderMermaidInHtml` により Mermaid コードブロックをインライン SVG へ展開・埋め込んだスタンドアロン HTML 生成、PDF印刷ダイアログ連携（`printMarkdownDocument` / `printHtmlContent`）における非表示 iframe 内の Mermaid SVG レンダリング完了をダブル `requestAnimationFrame` で待機する印刷ハンドシェイク機構（`performPrintHandshake` / `data-typori-mermaid-ready` / `typori:mermaid-ready` 送出）を実装。`src-tauri/src/fs.rs` の CSS に `.typori-mermaid-svg`、`.typori-mermaid-error`、および `@media print` 改ページ回避スタイルを追加。自動検証スクリプト（`scripts/verify-mermaid-export.mjs`）を作成し、総合結合テスト（`scripts/verify-all.mjs`: 全37個別テスト）へ統合。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-17: Phase 20 Mermaidダイアグラム機能 品質保証・総合結合テスト（タスク70）の実装および全検証完了。Mermaid描画・構文エラー耐性・テーマ追従・エクスポート・チートシート整合性をワンストップで網羅検証する自動テストスイート（`scripts/verify-mermaid-diagrams.mjs`）を作成し、総合結合テスト（`scripts/verify-all.mjs`: 全38個別テスト、IPC 14コマンド＋menu 1コマンド、OSメニュー 17イベント）へ統合。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo check` / `cargo clippy`: Exit Code 0）のパスを確認し、Phase 20 の全タスク完了を達成。
- 2026-10-17: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜20、全70タスク）の突き合わせ、仕様整合性確認、バックエンド単体テスト（24件 passed）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全38個別テスト、IPC 14+1コマンド、ネイティブメニュー 17イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様書の記述整合性（総合テスト件数・IPCコマンド・メニューイベント表記）を最新化・同期。
- 2026-10-17: 起動高速化・ホワイトブランク完全解消仕様（Phase 21）を策定。ハイブリッド・ウィンドウ表示制御（初期非表示 `visible: false` からの描画完了後即時 `show()` ＋セーフティフォールバック＋ `index.html` 0msテーマ背景色・スケルトン適用）、重いモジュール（CodeMirror 6、各種モーダル、Mermaid）の動的インポート分割（Code Splitting）、および起動時ワークスペース初期化IPCの一括化（`init_workspace`）を定義。
- 2026-10-18: Phase 21 起動高速化・ゼロフラッシュ・コード分割（タスク71〜76）の実装および品質保証の完了。Rust `init_workspace` 一括IPC、ウィンドウ初期非表示と表示ハンドシェイク、0msテーマ判定・スケルトン基盤、`React.lazy()` モジュール遅延ロードとチャンク最適化、自動テストスクリプト `verify-startup-acceleration.mjs` の整備と総合テスト統合（全40個別テスト合格）。
- 2026-10-18: Phase 22 リリースビルドの準備と成果物検証（タスク77〜78）。バージョン番号（package.json / tauri.conf.json / Cargo.toml: 0.1.0）、アイコンアセット、NSIS/MSI設定、リリースプロファイル最適化設定の点検、テスト件数（単体テスト28件、総合テスト40件、IPC 15コマンド）の同期、およびリリースビルド手順・チェックリストの整備を実施。
- 2026-10-18: セキュリティ強化・脆弱性対策仕様（Phase 23）を策定。ペネトレーションテスト結果に基づき、Mermaidの `securityLevel: "strict"` 化・`secure` ロック・SVGサニタイズ・`bindFunctions` 廃止・エラーHTMLエスケープ（CRIT-01 / MED-03）、Content Security Policy (CSP) 設定と外部リンクURLスキームホワイトリスト検証（HIGH-01 / MED-01）、HTMLエクスポート・PDF印刷時の生HTMLサニタイズとiframe隔離（HIGH-02）、バックエンドファイルシステムIPCのパストラバーサル防止・画像拡張子検証・ファイルサイズ上限（50MB）・再帰深度上限・シンボリックリンク除外（HIGH-03 / MED-02）、および `pnpm.overrides` による間接依存パッケージの脆弱性解消（LOW-01）を定義。
- 2026-10-18: HTMLエクスポート・PDF印刷時のサニタイズ強化（Phase 23 タスク81, HIGH-02）の実装および品質保証の完了。Rust バックエンド（`src-tauri/src/fs.rs`）における `sanitize_exported_html`（危険タグ・インラインイベントハンドラ・危険URIスキーム除去、GFM要素保護）の実装と単体テスト（33件 passed）、およびフロントエンド（`src/api/fs.ts`）における `sanitizeExportHtml` 実装と `printHtmlContent`（非表示iframe）および `exportToHtml` へのサニタイズ組み込み、自動テストスクリプト（`scripts/verify-security-hardening.mjs`）への検証追加、全総合テスト（`pnpm test`: 全41個別テスト合格）のパスを確認。
- 2026-10-18: バックエンドファイルシステムIPCの境界防御・DoS対策（Phase 23 タスク82, HIGH-03 / MED-02）の実装および品質保証の完了。Rust バックエンド（`src-tauri/src/fs.rs`）における `get_unique_file_path` / `save_image_file` / `save_image_binary` のパストラバーサル防止（ファイル名成分抽出・サニタイズ）、画像拡張子検証（`is_image_extension`）、ファイルサイズ・バイナリデータサイズ上限（`MAX_IMAGE_FILE_SIZE = 50MB`）、`resolve_image_path` の `..` 上位トラバーサル拒否（`Path traversal detected`）、および `search_dir_recursive` の最大再帰深度上限（`MAX_SEARCH_DEPTH = 16`）・シンボリックリンク除外の実装と単体テスト追加（39件 passed）、自動検証テストスクリプト（`scripts/verify-security-hardening.mjs` Part 4）の整備と全検証コマンド（`cargo test` / `cargo clippy` / `pnpm test` / `pnpm run build`: Exit Code 0）のパスを確認。
- 2026-10-18: 依存パッケージの既知脆弱性解消（Phase 23 タスク83, LOW-01）の完了。pnpm v12 に対応した `pnpm-workspace.yaml` および `package.json` への `overrides`（`source-map-js: ">=1.2.2"`, `katex: ">=0.18.2"`）設定とロックファイル（`pnpm-lock.yaml`）更新を行い、`pnpm audit` での脆弱性検出 0 件（No known vulnerabilities found）および全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-18: Phase 23 セキュリティ強化・脆弱性対策 品質保証・総合結合テスト（タスク84）の実装および全検証完了。Phase 23 の全セキュリティ対策（Mermaid厳格化・サニタイズ、CSP・URLスキーム検証、エクスポートHTMLサニタイズ、IPC境界防御・サイズ/深度制限、依存関係オーバーライド）を網羅検証する自動テストスクリプト（`scripts/verify-security-hardening.mjs`）を完成させ、総合結合テストスイート（`scripts/verify-all.mjs`: 全41個別テスト、IPC 15+1コマンド、ネイティブメニュー 17イベント）との完全統合を確認。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認し、Phase 23 および開発計画全84タスクの完了を達成。
- 2026-10-18: 全体レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜23、全84タスク）の突き合わせ、エッジケースの点検、バックエンド単体テスト（39件 passed）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全41個別テスト、IPC 15+1コマンド、ネイティブメニュー 17イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・更新。
- 2026-10-18: 書式クリア機能仕様（Phase 26: Clear Formatting / Bare）を策定。始まりと終わりのあるインライン記法全般（太字・イタリック・打ち消し線・コード・リンク等）の部分解除・整形仕様、WYSIWYG/ソース両モード対応、デフォルトショートカット（Ctrl+Shift+B）、編集メニュー（menu:clear_formatting）、ツールバーボタン、ショートカット設定およびチートシート連携を定義。
- 2026-10-18: ソース直接編集モードの表示・レイアウト・構文ハイライト完全改善仕様（Phase 24）を策定。行番号ガターと本文の自然な等幅配置・中央寄せによるガター分離解消、.cm-scrollerのスクロール最適化と高さ構造、GFM構文拡張（表・タスクリスト・自動リンク・打消し線）、@codemirror/language-data による主要プログラミング言語の構文ハイライト、ライト/ダークシンタックスハイライトテーマ、およびWYSIWYG/直接編集モード間のisSourceModeRef同期・未保存判定・生ソース完全保護の双方向コンテンツ同期を定義。
- 2026-10-18: ソース直接編集モードの構文ハイライト & GFM対応（Phase 24 タスク86）の実装および品質保証の完了。@codemirror/language-data による主要140+言語の構文ハイライト、@codemirror/lang-markdown への GFM 拡張（markdownLanguage）と codeLanguages の設定、Tailwind Zinc 調和ライト/ダークシンタックスハイライトテーマ（typoriLightHighlightStyle / typoriDarkHighlightStyle）の実装、および scripts/verify-source-editor.mjs による言語マッチ・GFMパース・テーマエクスポートの自動検証パスを確認。
- 2026-10-18: モード切替 & コンテンツ完全同期の堅牢化（Phase 24 タスク88）の実装および品質保証の完了。App.tsx の handleToggleSourceMode、handleExitSourceMode、handleSelectFile における isSourceModeRef の即時同期的更新による同期漏れ・レースコンディション解消、WYSIWYG切替時の未保存判定保護および未編集時の生ソース（savedContentRef）100%忠実保護、エディタ間でのスクロール位置退避・復元（editorScrollTopRef / initialScrollTop / requestAnimationFrame）による不自然なスクロール跳躍防止を実装。全検証コマンド（pnpm test / pnpm run build / cargo test / cargo clippy: Exit Code 0）のパスを確認。
- 2026-10-18: ソース直接編集モード表示・レイアウト・構文ハイライト・完全同期の品質保証・自動テスト（Phase 24 タスク89）の実装および全検証完了。自動テストスクリプト（`scripts/verify-source-editor-display.mjs`）を作成し、等幅一体レイアウト・余白・スクロール構造、Typori調和シンタックスハイライトテーマ（ライト/ダーク）、GFM構文要素（テーブル・打消し線・タスクリスト・コードブロック）ASTパース、主要11言語（JS/TS/Python/Rust/HTML/CSS/JSON等）構文パーサー動的ロード、App.tsx双方向Ref/State同期、未操作生Markdownテキスト100%保持シミュレーションを網羅検証。`scripts/verify-all.mjs`（全42個別検証テスト）に統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認して Phase 24 の全タスクを完了。
- 2026-10-18: 大容量Markdownファイル（800KB/5000行+）オープン高速化とパフォーマンス最適化仕様（Phase 25）を策定。オープン時間目標（フリーズ0.5秒以内）、WYSIWYG行番号ガターのビューポート仮想化（Forced Reflow完全排除・可視領域限定計算・rAFデバウンス）、Milkdown初回マウント時全件シリアライズ抑制、大容量ファイル検知（300KB/2000行+閾値）とCodeMirror 6仮想スクロール高速オープン連携、アウトライン・画像・Mermaidの遅延ロード最適化、およびパフォーマンステスト完成基準を定義。
- 2026-10-18: WYSIWYG行番号ガターのビューポート仮想化（Phase 25 タスク91）の実装および品質保証の完了。`src/components/Editor/Editor.tsx` の `lineNumbersPlugin` における全ブロック同期 `coordsAtPos` ループ（Forced Reflow）を撤廃し、二分探索関数（`findBlockIndexByPos`）と可視範囲特定関数（`getVisibleBlockRange`）によるビューポート仮想化、親スクロールコンテナ連動パッシブリスナー、`requestAnimationFrame` 更新デバウンス、および `DocumentFragment` 高速挿入を導入。`scripts/verify-line-numbers.mjs` に5000ブロック仮想化シミュレーションテストを追加し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo check`: Exit Code 0）のパスを確認。
- 2026-10-18: Milkdown初回マウント時シリアライズ最適化（Phase 25 タスク92）の実装および品質保証の完了。`src/utils/text.ts` に大容量判定定数（`LARGE_FILE_SIZE_THRESHOLD = 300 * 1024`, `LARGE_FILE_LINE_THRESHOLD = 2000`）および判定関数（`isLargeContent`）を実装・export。`src/components/Editor/Editor.tsx` の `listenerCtx.mounted` において、大容量ドキュメント（300KB以上または2000行以上、またはノードサイズ60000以上）の不要な全件シリアライズ（`serializer`）を抑制し、初期マウント時のメインスレッドブロックをゼロ化。自動テストスクリプト（`scripts/verify-large-mount-serialization.mjs`）の作成と `scripts/verify-all.mjs`（全43個別検証テスト）への統合、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-18: 大容量ファイル検知と直接編集モード高速オープン連携（Smart Large-File Handler、Phase 25 タスク93）の実装および品質保証の完了。`src/utils/text.ts` に `LargeFileInfo` インターフェースおよび `analyzeContentSize` 関数を実装・export。`src/App.tsx` においてワークスペース初期化（`initialize`）、ファイルオープン（`handleSelectFile`: 単一ファイル/複数タブ双方）、タブ切替（`handleSelectTab`）、タブクローズ（`handleCloseTab`）における大容量コンテンツ（300KB以上または2000行以上）の自動検知と、CodeMirror 6 仮想スクロール特性を活かした直接編集モードへの即時高速オープン連携（`checkAndApplySmartLargeFileMode`）を実装。UIヘッダー直下にファイルサイズ・行数表示付きモード案内バナー（WYSIWYG切替/高速モード復帰/閉じるボタン付き）を配置。自動検証テストスクリプト（`scripts/verify-smart-large-file-handler.mjs`）を作成し `scripts/verify-all.mjs`（全44個別検証テスト）へ統合、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-18: 大容量ファイル（800KB/5000行+）パフォーマンステスト・全機能整合性（Phase 25 タスク95）の実装および全検証完了。800KB（実測855KB）/5000行（実測11,864行）の模擬Markdownドキュメント（見出し・段落・リスト・表・コード・Mermaid・画像等）を生成し、大容量判定（`analyzeContentSize`: 3ms未満）・改行コード正規化（0.3ms）・Smart Handler連携（3ms未満）、WYSIWYG行番号ガターのビューポート仮想化によるForced Reflow 99.06%排除（5000回→26〜47回/フレーム、描画時間1ms未満）、初回マウント時シリアライズ完全スキップ（0回）、アウトライン抽出デバウンス（150ms）・画像遅延解決（50枚中5枚のみ初期解決）、およびCRLF/LF差分未保存誤爆防止・モード切替時ゼロ文字欠損・全機能整合性を網羅検証するパフォーマンステストスクリプト（`scripts/verify-large-file-performance.mjs`）を作成。総合結合テストスイート（`scripts/verify-all.mjs`: 全46個別検証テスト、IPC 15+1コマンド、ネイティブメニュー 17イベント）へ統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認して Phase 25 の全タスク完了を達成。
- 2026-10-18: 書式クリア純粋ロジック（Phase 26 タスク96）の実装および単体検証の完了。`src/utils/format.ts` に各種インライン記法・複合装飾の自動分割・置換関数 `clearInlineFormatting` を実装し、単体テストスクリプト `scripts/verify-clear-formatting-logic.mjs` を作成して全検証パスを確認。
- 2026-10-18: ソース直接編集モードの書式クリア機能（Phase 26 タスク97）の実装および検証完了。`src/components/Editor/SourceEditor.tsx` において `SourceEditorRef` を定義・公開し、CodeMirror 6 最小変更差分置換による `clearFormatting` コマンド、キーマップおよびDOMイベントでの `Ctrl+Shift+B` 先行バインドを実装。`scripts/verify-source-clear-formatting.mjs` による検証パスを確認。
- 2026-10-18: WYSIWYGモードの書式クリア機能（Phase 26 タスク98）の実装および検証完了。`src/components/Editor/Editor.tsx` において `EditorRef` に `clearFormatting` を追加し、ProseMirror の `tr.removeMark(from, to)` によるインラインMark一括解除、`tr.setStoredMarks([])` 初期化、空選択ガード、キーダウンでの `Ctrl+Shift+B` 実行を実装。`scripts/verify-wysiwyg-clear-formatting.mjs` による検証パスを確認。
- 2026-10-18: 書式クリアのUI・OS連携・ショートカット（Phase 26 タスク99）の実装および全検証完了。`src-tauri/src/menu.rs` の「編集」メニューに「書式をクリア (CmdOrCtrl+Shift+B)」および `menu:clear_formatting` イベント送出を追加。`SHORTCUT_ITEMS`（`Ctrl+Shift+B`）およびチートシート早見表への掲載、クイックアクションパレット（`EditorToolbar.tsx`）へのクリアボタン配置、`src/App.tsx` でのイベントリスナー・モード別動的ディスパッチ（`handleClearFormatting`）・グローバルキーダウン検知・`SourceEditorRef` 配線を実装。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-18: 書式クリア総合品質保証テスト・全体統合検証（Phase 26 タスク100）の実装および全検証完了。自動テストスクリプト `scripts/verify-clear-formatting.mjs` を作成し、純粋ロジック（空選択・部分分割・複合装飾・リンク解除）、ソース直接編集 CodeMirror 6、WYSIWYG ProseMirror（`tr.removeMark`）、ツールバーボタン配置、OSネイティブメニュー全18イベント、ショートカット定義、`App.tsx` 動的ディスパッチ、およびE2Eシナリオを網羅検証。`scripts/verify-all.mjs`（全50個別検証テスト、15IPCコマンド、18メニューイベント）へ統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認して Phase 26 および開発計画全100タスクの完了を達成。
- 2026-10-18: 全体総合レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜26、全100タスク）の突き合わせ、仕様整合性確認、バックエンド単体テスト（全39件 passed）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全50個別テスト、IPC 15コマンド、ネイティブメニュー 18イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・更新。
- 2026-10-18: 正式版 v1.8.0 リリースビルド準備・バージョン整合性点検（Phase 27 タスク101）の完了。package.json, tauri.conf.json, Cargo.toml のバージョン番号を 1.8.0 へ同期し、成果物検証スクリプト（scripts/verify-release-bundle.mjs）の動的バージョン解決対応、および scripts/verify-release-config.mjs による整合性検証（Exit Code 0）を確認。全検証コマンド（pnpm test / cargo test / cargo check / cargo clippy: Exit Code 0）のパスを確認。
- 2026-10-18: 正式版 v1.8.0 リリースビルド実行・成果物検証（Phase 27 タスク102）の完了。`pnpm run build:release`（`pnpm test` 全50テスト合格・`tsc` & `vite build` 成功・Rustリリース最適化コンパイル・NSIS/WiXバンドル生成）を正常完了し、リリースバイナリ（`typori.exe`: 6.36 MB）、NSISインストーラ（`Typori_1.8.0_x64-setup.exe`: 3.41 MB）、WiX MSIパッケージ（`Typori_1.8.0_x64_en-US.msi`: 4.06 MB）の生成と `scripts/verify-release-bundle.mjs` による完全性・SHA-256検証（Exit Code 0）を確認。Phase 27 および開発計画全102タスクの完全完了を達成。
- 2026-10-18: ソース直接編集モードのインデント・レイアウト最適化および行番号・スクロール不具合完全解消仕様（Phase 28）を策定。中央寄せコンテナ（max-width: 900px）・左右余白・Tabキーインデント（indentWithTab）・行頭空白描画保証（white-space: break-spaces / pre-wrap）、Flexbox幅・縦スクロール健全化（height/maxHeight 100%, overflowY auto, minWidth 0, flexGrow 1）、およびOSネイティブメニューのSubmenu再帰探索（find_check_menu_item）によるチェック状態同期仕様を定義。
- 2026-10-18: バックエンド修正（問題点C、Phase 28 タスク104）の実装および単体検証の完了。`src-tauri/src/menu.rs` において、`Menu` および `Submenu` を再帰走査する汎用ツリー探索関数 `find_in_menu_tree` および `find_check_menu_item` を実装。Tauri v2 のサブメニュー配下にネストされた CheckMenuItem（`toggle_line_numbers`）の取得とチェック状態更新コマンド（`set_line_numbers_menu_checked`）の同期処理を改修。多階層探索・除外ロジックを網羅検証する Rust 単体テスト（`test_find_in_menu_tree_recursive_search`）を追加し、バックエンド単体テスト（全40件 passed）、Clippy静的解析（警告0件）、フロントエンドビルド、総合結合テスト（`pnpm test`: 全50個別テスト合格）のパスを確認。
- 2026-10-18: エディタスタイル・スクロール修正（問題点A & B、Phase 28 タスク105）の実装および検証完了。`src/components/Editor/SourceEditor.tsx` の `customTheme` において、`.cm-scroller` に `height: "100%"`, `maxHeight: "100%"`, `overflow: "auto"`, `overflowY: "auto"`, `boxSizing: "border-box"` を適用して縦スクロール高さ健全化を行い、`.cm-content` に `minWidth: 0`, `flexGrow: 1`, `width: "100%"` を適用して行番号ガターのON/OFFやリサイズ時における本文幅潰れを解消。全検証コマンド（`pnpm run build` / `pnpm test` / `cargo test` / `cargo clippy`: Exit Code 0）の合格を確認。
- 2026-10-18: インデント操作・描画修正（課題2 & 3、Phase 28 タスク106）の実装および検証完了。`@codemirror/commands` を導入し、`SourceEditor.tsx` の `indentKeymap` において `Prec.highest(keymap.of([indentWithTab]))` を登録して Tab / Shift+Tab キーによるインデント・アンインデント操作を有効化（エディタからのフォーカス外れを完全防止）。さらに `customTheme` の `.cm-content` および `.cm-line` に `whiteSpace: "break-spaces"`, `wordBreak: "break-word"` を適用して行頭連続空白（2スペース・4スペース等）の描画保証とネストリスト・コードブロックのインデント保持を確立。全検証コマンド（`pnpm run build` / `pnpm test` / `cargo test` / `cargo clippy`: Exit Code 0）の合格を確認。
- 2026-10-18: エディタ全体レイアウト最適化（課題1、Phase 28 タスク107）の実装および検証完了。`src/components/Editor/SourceEditor.tsx` の `customTheme` の `&`（`.cm-editor`）に `maxWidth: "900px"`, `margin: "0 auto"` を適用し、CodeMirror コンポーネントに `max-w-[900px] mx-auto` クラスを設定。これにより、行番号ガターと本文が分離することなく一体となって中央に配置される Typora ライクな等幅執筆レイアウトを確立。さらに、画面外・余白領域クリック時のフォーカスハンドラ（`editorRef.current?.view?.focus()`）および `.cm-content` の左右パディング（32px）による自然余白を保証。全検証コマンド（`pnpm run build` / `pnpm test` / `cargo test` / `cargo clippy`: Exit Code 0）の合格を確認。
- 2026-10-19: ソース直接編集モード インデント・レイアウト・スクロール・行番号およびOSネイティブメニュー再帰同期 品質保証・自動テスト（Phase 28 タスク108）の実装および全検証完了。自動テストスクリプト（`scripts/verify-source-editor-indent-and-scroll.mjs`）を作成し、Tab/Shift+Tabキーによるインデント操作（`indentWithTab` / `Prec.highest`）、行頭空白描画保証（`whiteSpace: "break-spaces"`）、ネストリスト保持、中央寄せ最大幅コンテナ（`maxWidth: "900px"`, `margin: "0 auto"`）とガター一体化、行番号ON/OFF時の本文表示・幅潰れ解消（`minWidth: 0`, `flexGrow: 1`, `width: "100%"`）、縦スクロール健全化（`.cm-scroller` の `maxHeight: "100%"`, `overflowY: "auto"`、親隔離）、およびRustバックエンドのSubmenu再帰探索（`find_in_menu_tree` / `find_check_menu_item`）によるチェック状態同期を網羅検証。総合結合テストスイート（`scripts/verify-all.mjs`: 全51個別検証テスト、IPC 15コマンド、ネイティブメニュー 18イベント）へ統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo check` / `cargo clippy`: Exit Code 0）のパスを確認して Phase 28 および開発計画全108タスクの完全完了を達成。
- 2026-10-19: 全体総合レビュー（/review）を実施。for_agent/ 内の仕様書要件と全実装コード（Phase 1〜28、全108タスク）の突き合わせ、仕様整合性確認、バックエンド単体テスト（全40件 passed）、Clippy静的解析（警告0件）、フロントエンドTypeScript型検査・プロダクションビルド（Exit Code 0）、および総合結合テストスイート（全51個別テスト、IPC 15コマンド、ネイティブメニュー 18イベント、ショートカット定義整合性）の全自動検証パス（Exit Code 0）を確認し、仕様・品質整合性を確認・確定。
- 2026-10-19: 正式版 v1.8.1 リリースビルド準備・バージョン整合性点検（Phase 29 タスク109）の完了。package.json, tauri.conf.json, Cargo.toml のバージョン番号を 1.8.1 へ同期し、成果物検証スクリプトの動的バージョン解決および scripts/verify-release-config.mjs による整合性検証（Exit Code 0）を確認。全検証コマンド（pnpm test / cargo test / cargo check / cargo clippy: Exit Code 0）のパスを確認。
- 2026-10-19: 正式版 v1.8.1 リリースビルド実行・成果物検証（Phase 29 タスク110）の完了。`pnpm run build:release`（`pnpm test` 全51テスト合格・`tsc` & `vite build` 成功・Rustリリース最適化コンパイル・NSIS/WiXバンドル生成）を正常完了し、リリースバイナリ（`typori.exe`: 6.36 MB）、NSISインストーラ（`Typori_1.8.1_x64-setup.exe`: 3.41 MB）、WiX MSIパッケージ（`Typori_1.8.1_x64_en-US.msi`: 4.06 MB）の生成と `scripts/verify-release-bundle.mjs` による完全性・SHA-256検証（Exit Code 0）を確認。Phase 29 および開発計画全110タスクの完全完了を達成。
- 2026-10-19: ソース直接編集モードの行番号縦積み崩壊・スクロール不能の完全解消および生ソースインデント・レイアウトの抜本的健全化仕様（Phase 30 タスク111）を策定。行番号ガター縦落ち（.cm-content の width: 100% による Flexbox 折り返し）、過剰スタイルによる縦スクロール不能、および Milkdown マウント時シリアライズによる生ソース（インデント）破壊の根本原因分析と再発防止仕様を定義。
- 2026-10-19: ソース直接編集モード エディタスタイル・レイアウト抜本修正（Phase 30 タスク112）の実装および検証完了。`SourceEditor.tsx` の `customTheme` において `.cm-content` からガター縦落ち原因である `width: 100%` を完全撤廃し `flexShrink: 1` を追加、`.cm-scroller` に `display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: flex-start !important;` を明示して行番号ガター（`.cm-gutters`）と本文（`.cm-content`）の確実な横並び・一体化配置を確立。検証スクリプト（`scripts/verify-source-editor-indent-and-scroll.mjs`）を最新仕様に更新し、総合テストスイート（`pnpm test`: 全51個別テスト）および全検証コマンド（`pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-19: ソース直接編集モード 縦スクロール性健全化（Phase 30 タスク113）の実装および検証完了。`SourceEditor.tsx` の `customTheme` において `.cm-scroller` から CodeMirror 6 の仮想スクロール（`view.measure()` / `scrollDOM`）の高さ測定と干渉していた過剰プロパティ（`maxHeight: "100%"`, `minHeight: "100%"`, 重複した `overflowY: "auto"`）を完全排除し、CodeMirror 6 標準の仮想スクロール構成（`height: "100%"`, `overflow: "auto"`, `boxSizing: "border-box"`）へ是正。長文ドキュメントにおけるマウスホイールおよびスクロールバーによる滑らかな縦スクロールを復旧。検証スクリプト（`scripts/verify-source-editor-indent-and-scroll.mjs`）の Step 4.1 アサーションを更新し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-19: 生ソースインデント保護・描画修正（問題点3、Phase 30 タスク114）の実装および検証完了。未編集（クリーン）ファイルにおける Milkdown マウント時シリアライズによる `fileContentRef` / `savedContentRef` の自動上書きを禁止（生ソースを 100% 完全保護）、`Editor.tsx` の `remarkStringifyOptionsCtx` において `listItemIndent: "one" as const` を明示設定してネストリストのインデント（2スペース/4スペース等）保持を改修、および `SourceEditor.tsx` における `indentWithTab`（`Prec.highest`）と行頭空白描画（`whiteSpace: "break-spaces"`）を完全保証。全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認。
- 2026-10-19: ソース直接編集モード レイアウト・インデント実証的検証 & 生ソース100%保護 自動テストスイート構築および総合品質保証（Phase 30 タスク115）の実装および全検証完了。実際の CSS スタイルプロパティ（Flexbox 横並び `flex-direction: row !important`、`nowrap`、`width: 100%` 完全排除、CodeMirror 6 標準仮想スクロール `height: 100%; overflow: auto;`、`maxHeight` 排除）、Markdown AST パース＆シリアライズによる多階層ネストインデント（2スペース/4スペース）保持、および未編集ファイルの直接編集モード切替時における生ソース100%完全保護（Raw Markdown Preservation）を実証的に検証するテストスクリプト（`scripts/verify-source-editor-layout-and-indent.mjs`）を作成。総合結合テストスイート（`scripts/verify-all.mjs`: 全52個別テスト、IPC 15+1コマンド、ネイティブメニュー 18イベント、ショートカット定義整合性）へ統合し、全検証コマンド（`pnpm test` / `pnpm run build` / `cargo test` / `cargo clippy`: Exit Code 0）のパスを確認して Phase 30 および開発計画全115タスクの完全完了を達成。

