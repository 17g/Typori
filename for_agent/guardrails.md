# Typori プロジェクト ガードレール規約・手順書

このドキュメントは、Typori プロジェクトにおいて AI エージェントが自律的かつ安全に実装・改修を行うための**「問題解決及び注意を促すための手順書（ガードレール）」**です。
作業時に注意すべき事項を発見したときや、ミスの再発防止を指示されたときは、本ドキュメントに原因と対策を追記・保守してください。

---

## 1. プロジェクト概要 & アーキテクチャ構成
- **アプリケーション種別**: ローカル Markdown エディタ (GUI / デスクトップアプリ)
- **コア / バックエンド**: Rust (1.70+) + Tauri v2
- **フロントエンド**: React 18+ + TypeScript + Vite
- **エディタコア**:
  - Milkdown (WYSIWYG モード: ProseMirror + remark)
  - CodeMirror 6 (ソース直接編集モード: `@uiw/react-codemirror`, `@codemirror/lang-markdown`)
- **スタイリング**: Tailwind CSS
- **パッケージマネージャ**: pnpm (フロントエンド), cargo (バックエンド)
- **ホストOS環境**: Windows (PowerShell) / クロスプラットフォーム対応

---

## 2. 必須検証コマンド (Ground Truth Verification)
エージェントはコード修正・機能追加後、必ず以下の検証コマンドを実行し、Exit Code 0 であることを確認すること。

1. **全体総合結合テストスイート**:
   ```powershell
   pnpm test
   ```
   - `scripts/verify-all.mjs` により、全個別機能テスト（51件）、Tauri IPC コマンド登録整合性（15コマンド）、OSネイティブメニューイベント整合性（18イベント）、ショートカット定義の整合性を網羅検証する。
2. **フロントエンド型検査 & ビルド検証**:
   ```powershell
   pnpm run build
   ```
   - TypeScript コンパイル（`tsc`）および Vite プロダクションビルドにエラーがないことを確認する。
3. **バックエンド単体テスト & 静的解析**:
   ※ `Cargo.toml` は `<root>/src-tauri` にあるため、必ず `Cwd` を `<root>/src-tauri` に指定して実行すること（または `cd src-tauri`）。
   ```powershell
   # 作業ディレクトリ: src-tauri
   cargo test
   cargo check
   cargo clippy -- -D warnings
   ```
   - Rust 単体テストの合格、コンパイルエラーおよび Clippy 警告がゼロであることを確認する。

---

## 3. プロジェクト固有のガードレール集（ミス・トラブルの原因と対策）

### 3.1. Tauri IPC コマンド・OSネイティブメニューの双方向整合性
- **事象・ミス**:
  - Rust 側に新しいコマンドやメニューイベントを追加したのに、フロントエンド側で呼び出せない、または総合テスト（`pnpm test`）で不整合エラーとなる。
- **原因**:
  - Tauri v2 では、Rust 側 (`src-tauri/src/lib.rs` の `generate_handler!`) への登録、フロントエンド側 (`src/api/fs.ts`) の invoke ラッパー定義、およびメニューイベント (`src-tauri/src/menu.rs` と `App.tsx`) のイベント名定義が完全一致していなければならない。
- **対策**:
  1. 新規 IPC コマンド追加時は、以下を同時に更新すること:
     - `src-tauri/src/fs.rs`: コマンドの実装
     - `src-tauri/src/lib.rs`: `tauri::generate_handler![...]` への登録
     - `src/api/fs.ts`: フロントエンド側の invoke 型付き関数定義
     - `scripts/verify-all.mjs`: `expectedBackendCommands` 配列への追加
  2. メニューイベント追加時は、Rust 側 `menu.rs` のイベント文字列と `App.tsx` の `listen` イベント文字列を完全一致させ、`scripts/verify-native-menu.mjs` および `scripts/verify-all.mjs` を更新すること。

### 3.2. Milkdown / Remark シリアライズ仕様の維持
- **事象・ミス**:
  - Markdown ファイル保存時に、箇条書き記号が `*` に変わる、連続箇条書きブロックでマーカーが交代する、URL 同一リンクが `<URL>` に勝手に短縮される、連番リストの番号が消える・乱れる。
- **原因**:
  - `remark-stringify` および `mdast-util-to-markdown` のデフォルト仕様により、マーカー交代ロジック（`bulletOther` へのフォールバック）やリソースリンクの自動縮約（`<...>`）が働くため。
- **対策**:
  1. `src/components/Editor/Editor.tsx` の `remarkStringifyOptionsCtx` において、以下の設定を崩さないこと:
     - `bullet: "-"`: 箇条書き記号は常にハイフン
     - `bulletOrdered: "."`: 番号付きリストはピリオド
     - `incrementListMarker: true`: 連番インクリメントを維持
     - `resourceLink: true`: URL同一リンクでも `[URL](URL)` 形式を維持
     - `rule: "-"`, `ruleRepetition: 3`, `ruleSpaces: false`: 水平線は常に `---`
     - `handlers`: 連続箇条書きブロック間のハイフン一貫性を維持するカスタム `list` ハンドラーを必ず組み込むこと。
  2. 変更時は必ず `scripts/verify-markdown-general-serialization.mjs` および `pnpm test` で出力フォーマットを検証すること。

### 3.3. ショートカット競合とキーボードイベントの伝播制御
- **事象・ミス**:
  - ソースコード直接編集モード（CodeMirror 6）で `Ctrl + /` を押した際、WYSIWYG モードへの切り替えと同時に、CodeMirror 本体の行コメント `<!-- -->` が挿入されてしまう。
  - ショートカット設定モーダルでキー入力を受け付ける際、エディタ本体のショートカットが誤発火する。
- **原因**:
  - CodeMirror や入力モーダル内のネイティブキーボードイベントと、親コンポーネント（`App.tsx`）のグローバル `keydown` リスナーが二重にイベントを検知・処理してしまうため。
- **対策**:
  1. モーダル表示中（`ShortcutSettingsModal`, `CheatSheetModal`, `ExportModal` 等）は、エディタ本体のグローバルショートカット実行をガード（スキップ）すること。
  2. CodeMirror 内部で `Ctrl + /` などのアプリ固有キーバインドを横取りされないよう、`SourceEditor.tsx` のキーマップ定義または親イベントリスナーで `preventDefault()` / `stopPropagation()` を適切に制御すること。

### 3.4. 改行コード（CRLF vs LF）と未保存判定（Dirty state）の誤爆防止
- **事象・ミス**:
  - Windows 環境でファイルを開いた直後、何も編集していないのにタブに未保存マーク（●）が表示される。
- **原因**:
  - ディスク上のファイル改行コードが CRLF (`\r\n`) であるのに対し、Milkdown や CodeMirror は内部で LF (`\n`) に正規化して保持するため、文字列比較（`initialContent !== currentContent`）で不一致となり未保存と判定されてしまう。
- **対策**:
  1. ファイル読み込み時（`open_file`）またはエディタへのセット時に、コンテンツの改行コードを LF に統一正規化（`.replace(/\r\n/g, '\n')`）すること。
  2. 未保存判定のベースラインコンテンツ（`initialContentRef` / `originalContent`）も同一の正規化後テキストで同期すること。

### 3.5. タブ切り替え・ファイルロード時の非同期レースコンディション防止と未保存状態の独立性担保
- **事象・ミス**:
  - タブ A からタブ B へ素早く切り替えた際、タブ B の内容でタブ A が上書き保存されたり、エディタ内部の参照（Ref）が古いファイルを指したままになる。
  - タブ A で編集した未保存フラグが、新しく開いたタブや無編集の別タブに誤って伝播・表示される。
- **原因**:
  - React のステート更新は非同期（レンダリング待ち）であるため、ハンドラ実行中に即時更新されない `tabsRef`, `activeTabIdRef`, `selectedPathRef`, `fileContentRef` を参照するショートカットやイベントリスナーが古いクロージャの値を参照してしまうため。
  - `SourceEditor` に `key` が設定されていない場合、エディタ内部の Undo 履歴やカーソル位置がタブ間で混交する。
- **対策**:
  1. `handleSelectTab`, `handleSelectFile`, `handleCreateFile`, `handleCloseTab`, `handleSave`, `handleContentChange` において、`tabsRef.current`, `activeTabIdRef.current`, `selectedPathRef.current`, `fileContentRef.current`, `savedContentRef.current` をイベントハンドラ内で即座に同期的更新すること。
  2. タブ切り替え時は、切り替え元の変更内容を `tabsRef` に退避した上で、切り替え先タブの `isDirty` を該当タブ固有の `content` と `savedContent` から `isContentDirty` により完全に独立して再評価すること。新規ファイルオープン・作成時は必ず `isDirty: false` で初期化すること。
  3. `SourceEditor` には `key={selectedPath ?? "__source__"}` を付与し、ファイル切り替え時にエディタ内部状態を確実にクリーンリセットすること。
  4. Node.js ESM 検証スクリプト（`.mjs`）から TypeScript ファイル（`.ts`）は直接静的 import できないため、ユーティリティロジックはスクリプト内に同等実装するか、ファイル内容の静的検証を行うこと。

### 3.6. ウィンドウクローズ時の未保存保護と Tauri Capabilities 設定
- **事象・ミス**:
  - 未保存の変更がある状態でウィンドウ右上の「×」ボタンを押した際、確認ダイアログが出ずにアプリが終了してしまう。
- **原因**:
  - Tauri v2 では、ウィンドウの `CloseRequested` イベントをキャンセル（`event.preventDefault()`）してダイアログを表示するためには、Tauri 側の設定および権限（Capabilities）が正しく構成されている必要がある。
- **対策**:
  1. `src-tauri/capabilities/` 内でウィンドウ関連の権限（`core:window:allow-close`, `core:event:allow-listen` 等）を漏れなく定義すること。
  2. フロントエンド側で `appWindow.onCloseRequested` を購読し、未保存ドキュメントが存在する場合はウィンドウクローズをブロックして保存確認ダイアログを起動すること。

### 3.7. クイックアクションパレットとアウトライン（右サイドバー）の配置干渉
- **事象・ミス**:
  - エディタをスクロールしたときにツールバーが画面外へ流れて消える、または右サイドバーを開いた際にツールバーと重なってボタンが押せなくなる。
- **原因**:
  - ツールバーがエディタ本文のスクロールコンテナ内に直接配置されていたり、右サイドバーの開閉ステートと座標・マージンが連動していないため。
- **対策**:
  1. ツールバー（`EditorToolbar`）はスクロールコンテナ外部に独立してフロート配置すること。
  2. スクロール時はオートハイド（`opacity-0 pointer-events-none`）させ、右上トリガーゾーンへのマウスホバー（`Hover Reveal`）で再表示すること。
  3. 右サイドバーが開いているときは、`rightSideBarOpen` ステートに応じてツールバーの `right` 位置・マージンを自動シフトさせ、重なりを防止すること。

### 3.8. 静的解析・統合検証テストスクリプト作成時のトークン・引数名整合性
- **事象・ミス**:
  - 実装コード自体は正しく動作しているにも関わらず、テストスクリプト内の静的コード検査（`fs.readFileSync` + `assert.ok(content.includes(...))`）において、仮定した引数名（例: `content` と `raw`）の不一致によりアサーションエラーとなる。
- **原因**:
  - 実装コードの具体的な引数名や内部変数名を事前に精査せず、推測で静的マッチング文字列を定義してしまうため。
- **対策**:
  1. 静的検証アサーションを作成する前に、対象ソースファイル（`fs.ts`, `Editor.tsx`, `App.tsx` 等）の実装内容を `view_file` で正確に確認し、確実に一致するトークンやシグネチャをターゲットに指定すること。
  2. 命名揺れに依存しないよう、正規表現や AST、または動作シミュレーションテストを併用して堅牢なテストを構成すること。

### 3.9. ウィンドウクローズ制御（Rust側 CloseRequested インターセプトと双方向ハンドシェイク）
- **事象・ミス**:
  - フロントエンドの `appWindow.onCloseRequested` リスナーのみに依存している場合、OSネイティブウィンドウのクローズボタン押下時に非同期処理やWebViewの遅延によりウィンドウが即座に破棄され、未保存の変更が喪失してしまう。
- **原因**:
  - Tauri v2 では、OSネイティブレベルでのウィンドウ破棄を確実に遮断・一時保留するには、Rustバックエンドの `on_window_event` で `api.prevent_close()` を呼ぶ必要があるため。
- **対策**:
  1. Rust側 (`src-tauri/src/lib.rs`) で `.on_window_event` を実装し、`WindowEvent::CloseRequested { api, .. }` を捕捉して `api.prevent_close()` で即時保留する。
  2. 保留後に `window.emit("window:close_requested", ())` をフロントエンドに送信し、フロントエンド側で未保存確認ダイアログ（`window.confirm`）を表示して、終了が承認された場合のみ `destroy()` を呼ぶハンドシェイク構成を採ること。

### 3.10. Milkdown 初回シリアライズ差異による未保存（Dirty）判定の誤爆防止
- **事象・ミス**:
  - ファイルを開いた直後、ユーザーが何も入力・編集していないにもかかわらず、未保存マーク（●）が表示される。
- **原因**:
  - Milkdown のマウント時および初期パース・シリアライズ時に、空行やリストインデント等の微小なフォーマット差異が生じ、`markdownUpdated` が発火して `onChange` を呼び出すことで `isContentDirty` が `true` になってしまうため。
- **対策**:
  1. マウント時およびファイルロード直後は、ユーザーによる能動的な編集操作（キーストロークやコマンド操作）が行われるまで初期シリアライズ更新による Dirty 判定を抑制するイベントガードを設けること。
  2. またはファイルロード完了直後の初期シリアライズ結果を `savedContent` / `savedContentRef` の基準値として確定（ベースライン同期）させること。

### 3.11. 単一ファイル切替時における未保存ステータスの確実な破棄とクリーン状態リセット
- **事象・ミス**:
  - タブ機能無効（単一ファイルモード）時に、未保存警告ダイアログで「OK（保存せずに別ファイルを開く）」を選択して別ファイルを開いた後、前のファイルの未保存フラグや保存ステータスが残留してしまう。
- **原因**:
  - 単一ファイルモードにおいて別ファイルを開く処理の中で、前のファイルの未保存状態（`isDirty`、`saveStatus`、`saveError`、Ref、エディタ内部キャッシュ）が確実にクリアされていないため。
- **対策**:
  1. `handleSelectFile` において未保存破棄を承認した後は、新しいファイルのロード直後に `isDirty: false`、`fileContent = newContent`、`savedContent = newContent`、`saveStatus = null`、`saveError = null` を同期的かつ完全にリセットすること。
### 3.12. Tauri プロジェクトにおける Cargo コマンド実行ディレクトリの指定（Cwd = src-tauri）
- **事象・ミス**:
  - `cargo check` や `cargo test` をプロジェクトルート（`./`）で実行して `error: could not find 'Cargo.toml'` で失敗する。
- **原因**:
  - Tauri プロジェクトでは Rust バックエンドの構成ファイル `Cargo.toml` が `<root>/src-tauri` に配置されているため。
- **対策**:
  1. `cargo check`, `cargo test`, `cargo clippy` などの Cargo コマンドを実行する際は、必ず `Cwd: <root>/src-tauri` を明示的に指定すること。

### 3.13. タブ切り替え時のエディタ再マウントによる未保存ステータス（isDirty / savedContent）誤リセット防止
- **事象・ミス**:
  - タブ機能有効時、タブAでファイルを編集して未保存状態（●マーク）にした後、タブBに切り替えてから再びタブAに戻ると、タブAの未保存マーク（●）が消えてしまい、保存確認ダイアログが出ずにタブを閉じることができてしまう。
- **原因**:
  - `key={selectedPath}` によるエディタ再マウント時に、マウント完了時の初期シリアライズ通知（`meta.isUserInteraction === false`）が無条件で `savedContent` を上書きし、`isDirty: false` にリセットしてしまうため。
  - Phase 17で導入された初回シリアライズ誤差吸収ロジックが、「対象タブが未保存変更を保持しているか」のチェックを欠いており、未保存タブへの切り替え時にも誤爆してディスク保存基準値（`savedContent`）を現在の編集後コンテンツで上書きしてしまっていた。
- **対策**:
  1. `handleContentChange` において `meta.isUserInteraction === false` を受け取った際は、対象タブが未保存状態（`isDirty: true` または `isContentDirty(content, savedContent)`）であるかを必ず判定し、未保存タブに対しては `savedContent` / `savedContentRef` の上書きと `isDirty` リセットを絶対に実行せず、既存のディスク保存基準値（`savedContent`）と未保存状態を保護すること。
  2. 初期シリアライズ差分のベースライン同期は、ディスクから読み込んだ直後や保存直後のクリーンな状態（`!isDirty`）のファイルにのみ限定して適用すること。
  3. `handleCloseTab` においても、タブの `content` と `savedContent` の `isContentDirty` チェックを厳格に行い、未保存タブが警告なしで閉じられることがないよう二重の防護策を講じること。
  4. `hasUnsavedChanges` の判定において、エディタから届いた初期シリアライズ値（`normalized`）と保存基準値（`savedContent`）を比較して未保存判定に含めないこと。クリーンタブにおける初回シリアライズ差異そのものを「ユーザーによる未保存変更」と誤認してベースライン同期を阻害し、未保存マークが誤点灯するのを防ぐため、未保存判定は対象タブの既存ステータス（`tab.isDirty`）および退避コンテンツ（`tab.content` と `tab.savedContent`）の比較のみに依拠すること。

### 3.14. ProseMirror カスタム NodeView（Mermaidブロック等）の実装と型制約・ライフサイクル管理
- **事象・ミス**:
  - Milkdown / ProseMirror で特定のノード（`code_block` の言語が `mermaid` の場合など）に対してカスタム NodeView を提供する際、TypeScript 型エラー（`ignoreMutation` の引数型不一致、`nodeViews` 内での `undefined` 許容エラー）が発生する。
  - レンダリングした SVG プレビュー内の DOM 変更を ProseMirror が検知してドキュメントの破壊や不要なトランザクションを発行してしまう。
  - 非同期パース・レンダリング（Mermaid の `render`）において、ユーザーの素早いタイピング時に古い描画結果が遅れて DOM に反映される race condition が発生する。
- **原因**:
  - ProseMirror の `NodeView.ignoreMutation` は標準の `MutationRecord` ではなく `{ type: "selection"; target: Node }` を含むユニオン型を受け取る仕様であるため。
  - ProseMirror の `NodeViewConstructor` 型定義は戻り値として `NodeView` 必須と定義されているが、特定ノード（通常コードブロック等）をデフォルト描画へフォールバックさせるには falsy（`undefined`）を返す実行時仕様との間に型の不一致があるため。
  - ProseMirror は `contentDOM` 以外の DOM 変更も監視対象とするため、プレビュー領域の SVG 差し替えが mutation として検知されてしまうため。
- **対策**:
  1. `ignoreMutation`: 引数型を `MutationRecord | { type: "selection"; target: Node }` と定義し、`this.contentDOM.contains(mutation.target)` の場合のみ `false`（ProseMirror に処理させる）を返し、プレビュー領域などの変更はすべて `return true;` で ProseMirror の介入を遮断すること。
  2. `nodeViews` の型キャスト: `nodeViews` ファクトリ内で `isMermaidLanguage(node.attrs.language)` を判定し、Mermaid 以外の通常コードブロックで `return undefined;` を返す関数全体を `as any` でキャストして実行時のデフォルトフォールバックを維持すること。
  3. 非同期レンダリングの race condition 防止: `renderVersion` カウンタ（または token）を管理し、非同期レンダリング完了時に最新バージョンと一致する場合のみ DOM（SVG）を更新すること。
  4. Selection 連動: プラグインの `view().update` フックで Selection の変化を監視し、アクティブな全 NodeView インスタンスへ通知（`updateActiveState()`）してソースコード展開・折りたたみを追従させること。

### 3.15. Mermaid ダイアグラムのテーマ連動と動的再レンダリング
- **事象・ミス**:
  - アプリケーション全体のライト/ダークテーマを切り替えても、Mermaid ダイアグラムの配色（SVG）が追従しない、または古いテーマの白背景がダークモード下のコンテナ内で不自然に浮き出てしまう。
  - 既存のテストスクリプト（`verify-mermaid-core.mjs` 等）で `theme === "dark" ? "dark" : "default"` などの特定トークンを完全一致アサーションしている場合、リファクタリング時に中間変数（例: `const isDark = theme === "dark"; theme: isDark ? ...`）に置き換えるとテストが失敗する。
- **原因**:
  - Mermaid は `mermaid.initialize` の設定を内部にキャッシュするため、明示的に `theme` や `themeVariables` を更新して再初期化（`force: true`）しなければ動的にスタイルが反映されない。
  - Mermaid の生成する SVG ルート要素に `background-color: white` 等の固定インラインスタイルが混入する場合がある。
  - 既存の静的解析テストスクリプトが特定のコード表現を前提としており、意味的に等価なリファクタリングでも文字列不一致となるため。
- **対策**:
  1. テーマ切り替え時は `initMermaid(theme, true)` / `updateMermaidTheme(theme)` で強制再初期化を行い、Tailwind CSS のダークモード配色（`#1f2937` 背景、`#f3f4f6` テキスト等）を `themeVariables` に適用すること。
  2. 生成された SVG から不要な白背景インラインスタイルを `transparent` へ自動正規化すること。
  3. React Props（`theme`）、CustomEvent（`typori:theme-change`）、および DOM クラス監視（`MutationObserver`）を併用し、どの契機でのテーマ変更でも漏れなく `rerenderAllMermaidDiagrams()` が発火するようにすること。
  4. 既存テストスクリプトが存在するモジュールを改修する際は、テスト側で指定されているアサーション文字列（トークン形式）との整合性を事前・事後に必ず確認すること。

### 3.16. Mermaid エクスポート連携（HTML/PDF印刷）と iframe 印刷待機ハンドシェイク
- **事象・ミス**:
  - HTML エクスポート時にダイアグラムが `<pre><code class="language-mermaid">` のまま出力され、スタンドアロン HTML をブラウザで開いてもダイアグラムが表示されない。
  - PDF 印刷時に iframe の `window.print()` が Mermaid の SVG レンダリング完了前に即座に発火し、ダイアグラムが白紙・欠落した状態で印刷・PDF 化されてしまう。
  - `exportToHtml` でフロントエンド完結処理を行う際に `invoke("export_to_html")` の呼び出しを完全に削除してしまうと、Tauri IPC コマンド整合性テスト（`verify-all.mjs`）で未登録エラーとして検知される。
- **原因**:
  - pulldown-cmark 単体では Mermaid (JavaScript) を解釈・レンダリングできないため、フロントエンドで HTML 内のコードブロックをインライン SVG へ置換する必要がある。
  - 非同期の Mermaid レンダリングや DOM 挿入、ブラウザのレイアウト計算（リフロー）完了を待たずに `print()` を実行すると、グラフィックがまだ描画パイプラインに乗っていないため。
- **対策**:
  1. HTML エクスポートおよび PDF 印刷ドキュメント生成時に `renderMermaidInHtml` を介して Mermaid コードブロックをスタンドアロンなインライン SVG（`.typori-mermaid-svg`）に事前展開すること。
  2. `printHtmlContent` において、iframe 内の Mermaid ダイアグラムの描画確定（ダブル `requestAnimationFrame`）を待機するハンドシェイク（`performPrintHandshake` / `data-typori-mermaid-ready` / `typori:mermaid-ready`）を経てから `window.print()` を起動すること。
  3. バックエンド直接呼び出し用のエクスポートラッパー（`rawExportToHtml` 等）を `src/api/fs.ts` に残し、Tauri IPC コマンドの双方向登録整合性を維持すること。

### 3.17. 起動時白画面フラッシュ防止のための0msテーマ判定スクリプトと初期スケルトン整合性
- **事象・ミス**:
  - アプリ起動時（特にダークテーマ設定時やOSダークモード時）に、一瞬真っ白な画面が露出（ホワイトブランク・白フラッシュ）し、Reactコンポーネントがマウントされた後にダーク背景に切り替わる現象が発生する。
- **原因**:
  - ReactおよびTailwind CSSのCSSバンドルがパースされ、`useTheme` カスタムフックの `useEffect` が実行されるまで `html` 要素に `dark` クラスが付与されず、デフォルトのブラウザ背景色（白）が表示されるため。
  - `#root` 内が空のままであると、Reactがマウントされるまでの数百ミリ秒間、ウィンドウにコンテンツが何も描画されず空白状態となる。
- **対策**:
  1. `index.html` の `<head>` 内に同期的インラインスクリプトを配置し、0msで `localStorage.getItem("typori-theme")` および `window.matchMedia("(prefers-color-scheme: dark)")` を判定して `document.documentElement.classList.add("dark")` と `style.backgroundColor = "#18181b"` を適用すること。
  2. `<head>` 内にインライン `<style>` を含め、外部CSSのロード前でも `:root` および `html.dark` の背景色・スケルトン用CSS変数が即時反映されるようにすること。
  3. `index.html` の `#root` 内部に初期スケルトンDOM（サイドバー枠・ヘッダー枠・エディタ枠・ステータスバー枠）を配置し、Reactマウント完了まで白画面ではなくアプリの概観がちらつくことなく表示されるようにすること（React 18の `createRoot` によりマウント時に自動置換される）。
  4. `src/hooks/useTheme.ts` の `applyTheme` においても `root.style.backgroundColor` を同期更新し、インラインスクリプトとReact側のテーマ管理の整合性を保つこと。

### 3.18. 起動時ウィンドウ表示制御（ハンドシェイク）とセーフティフォールバック・インポート整合性
- **事象・ミス**:
  - ウィンドウ初期非表示（`visible: false`）の採用時、フロントエンドの初期化エラーや遅延によってウィンドウが永久に表示されず、プロセスは起動しているのに画面が出ない状態（ハング）に陥る。
  - `src-tauri/src/lib.rs` に新しいトレイト（`use tauri::Manager;` 等）を追加した際、`use tauri::{Emitter, Manager};` のように既存の単独行インポートをまとめると、既存の総合結合テスト（`verify-phase17-fixes.mjs`, `verify-window-close-intercept.mjs`）の静的検査（`use tauri::Emitter;`）が失敗する。
  - フロントエンドで一括IPC（`initWorkspace`）へ移行した際、不要となった個別API（`getCurrentDir`, `getCliArgs` 等）のインポートが残り、TypeScriptの未使用変数エラー（TS6133）でビルドが失敗する。
- **原因**:
  - ウィンドウ表示制御がフロントエンドの非同期完了通知のみに依存している場合、何らかの例外や未解決Promiseで表示トリガーが失われるため。また、既存テストの一部が特定トークンの完全一致検査を行っているため。
- **対策**:
  1. ウィンドウ表示は、フロントエンド初期化完了時の `getCurrentWindow().show()` 呼び出しに加えて、フロントエンド側（400ms）およびRustバックエンド側（`setup` 内の500msスレッド）の双方に「自動 `show()` セーフティフォールバック」を設けてハングを二重に防止すること。
  2. `src-tauri/src/lib.rs` でのインポートは既存の静的検査との互換性を崩さないよう、`use tauri::Emitter;` の行をそのまま維持し、追加のトレイトは別行（`use tauri::Manager;`）で宣言すること。
  3. APIの移行に伴って呼び出しが消えたインポートは、TypeScriptの型検査（`tsc`）で TS6133 エラーが発生するため、忘れずに `import` リストを整理すること。

### 3.19. Mermaid ダイアグラムの XSS 防止と SVG サニタイズ整合性
- **事象・ミス**:
  - Markdown ファイル内に記述された悪意あるディレクティブ（`%%{init: {'securityLevel': 'loose'}}%%`）や、ダイアグラム内のリンク・クリックイベント（`javascript:` / `click Node call ...`）により、WebView 内で任意のスクリプトが実行（Stored XSS）されるリスクが生じる。
  - エクスポート時のエラー出力において未エスケープの文字列を出力すると、エラーメッセージ内の HTML タグがそのまま評価されてしまう。
- **原因**:
  - Mermaid の初期化設定で `securityLevel` が loose に設定されていたり、ディレクティブによるオーバーライド（`secure` 設定未適用）が可能な場合、コードブロック記述者によってセキュリティ制約が解除されるため。
  - レンダリングされた SVG やエラーメッセージ文字列をサニタイズせずに DOM/HTML へ直接挿入してしまうため。
- **対策**:
  1. `initMermaid` で必ず `securityLevel: "strict"` および `secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize"]` を設定し、図単位の動的オーバーライドをロックすること。
  2. レンダリングされた SVG は DOM 挿入および返却前に `sanitizeMermaidSvg` を通し、`<script>`, <iframe>, <object>, <embed>, <form>, <base> などのタグ、`on*` 属性、および `javascript:` / `vbscript:` / `data:text/html` スキームを完全に除去・無害化すること。
  3. `mermaidPlugin.ts` での `result.bindFunctions` の呼び出しを行わないこと。
  4. エクスポートやプレビューでエラーメッセージを HTML 出力する際は、必ず `escapeHtml` を適用すること。

### 3.20. HTMLエクスポート・PDF印刷時のサニタイズと iframe 境界防御・既存テスト変数名整合性
- **事象・ミス**:
  - Markdown ファイル内に記述された悪意ある生 HTML（`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>`, `<meta http-equiv...>`）やイベントハンドラ（`onload`, `onerror`, `onclick`）、危険な URI スキーム（`javascript:`, `vbscript:`, `data:text/html`）がサニタイズされずにエクスポート HTML や印刷用 iframe に書き込まれると、WebView やブラウザでスクリプトが実行され、親ウィンドウ（`window.parent.__TAURI_INTERNALS__`）にアクセスされる脆弱性（Stored XSS）が生じる。
  - Rust 側テストで raw string リテラル `r#"..."#` を使用した際、HTML 内のカラーコード（例: `fill="#3b82f6"`）に含まれる `"#` により文字列が意図せず途中で閉じ、コンパイルエラーとなる。
  - `exportToHtml` などの公開関数をリファクタリングした際、既存の静的検証スクリプト（`verify-mermaid-export.mjs` 等）が期待する特定トークン（`await saveFile(path, finalHtml)`）の変数名を変更してしまい、テストが失敗する。
- **原因**:
  - Markdown パーサー（`pulldown-cmark`）は Markdown 内のインライン HTML をそのまま出力するため、エクスポート出力前にサニタイズ処理を挟む必要がある。
  - Rust の raw string では二重引用符とハッシュ記号のペアで終端を判定するため、内部に `"#` が含まれる場合は `#` の個数を増やしてエスケープする必要がある（`r##"..."##`）。
  - 既存の検証スクリプトは信頼性担保のため主要変数の使用を文字列レベルで検査している場合がある。
- **対策**:
  1. バックエンド（`src-tauri/src/fs.rs`）の `convert_markdown_to_html` において、`pulldown-cmark` の HTML 出力直後に `sanitize_exported_html(&body_html)` を必ず適用すること。
  2. フロントエンド（`src/api/fs.ts`）においても `sanitizeExportHtml` をエクスポートし、`exportToHtml` および `printHtmlContent` で非表示 iframe に流し込む直前に二重サニタイズを適用すること。
  3. GFM 標準の要素（見出し、表、チェックボックス `<input type="checkbox" disabled="" checked="" />`、コードブロック、画像、安全なリンク、Mermaid コンテナ）は決して破壊せず完全に保持すること。
  4. Rust 単体テスト等で HTML/CSS のハッシュ（`#`）を含む文字列を raw string に含める場合は、必ず `r##"..."##`（二重ハッシュ）を使用すること。
  5. 既存テストスクリプトが存在する API モジュールを変更する際は、テスト側で指定されている変数名やトークンとの完全整合性を維持すること。

### 3.21. バックエンドファイルシステムIPCのパストラバーサル防止・拡張子/サイズ検証・検索再帰深度制限 (HIGH-03 / MED-02)
- **事象・ミス**:
  - `save_image_binary` や `save_image_file` に `../../etc/evil.png` のような相対パスを含むファイル名が渡された際、assets フォルダ外の予期しない場所にファイルが保存・上書きされてしまう。
  - `read_file_binary` や `resolve_image_path` に秘密鍵ファイルや実行ファイル（`.exe`, `.key` 等）や巨大ファイルが指定され、重要データの漏洩やメモリ枯渇（OOM DoS）が発生する。
  - `search_files` で循環シンボリックリンクや極端に深いディレクトリ構造を探索した際、スタックオーバーフローや無限ループによるアプリ停止が発生する。
- **原因**:
  - IPCコマンドへの引数をそのまま `dir.join(file_name)` したり、拡張子やファイルサイズを検証せずにファイルシステム操作を実行していたため。
- **対策**:
  1. `get_unique_file_path`, `save_image_file`, `save_image_binary` では、必ず `std::path::Path::new(file_name).file_name()` によりファイル名成分のみを抽出し、パス区切り文字や `..` を完全に無害化して配置すること。
  2. 画像操作コマンド（`save_image_file`, `save_image_binary`, `resolve_image_path`, `read_file_binary`）では、必ず `is_image_extension` によるホワイトリスト拡張子検証を行うこと。
  3. バイナリ読み込み・画像保存時には `MAX_IMAGE_FILE_SIZE`（50MB）の上限チェックを適用し、大容量ファイルによるメモリ消費やDoSを防止すること。
  4. `resolve_image_path` においては、相対パスの各コンポーネントを検証し、`..` によるベースディレクトリ外への上位トラバーサルを拒否すること。
  5. `search_dir_recursive` では、シンボリックリンク（`ft.is_symlink()`）をスキップし、最大再帰深度 `MAX_SEARCH_DEPTH`（16階層）を設定して探索を確実に打ち切ること。

### 3.22. pnpm v11/v12 における設定ファイル（pnpm-workspace.yaml）と依存関係オーバーライド（overrides）
- **事象・ミス**:
  - `package.json` に `"pnpm": { "overrides": { ... } }` を追加して `pnpm install` を実行しても、`[WARN] The "pnpm" field in package.json is no longer read by pnpm` の警告が表示されてオーバーライドが無視され、`pnpm-lock.yaml` が更新されず `pnpm audit` で既知脆弱性が解消されない。
- **原因**:
  - pnpm v11 以降（現行 v12）、pnpm は `package.json` 内の `"pnpm"` フィールド（`pnpm.overrides`, `pnpm.patchedDependencies` 等）からの設定読み込みを廃止し、すべての設定をプロジェクトルートの `pnpm-workspace.yaml` に集約する仕様に変更されたため。
- **対策**:
  1. 依存関係のバージョンオーバーライドは、プロジェクトルートの `pnpm-workspace.yaml` に以下の形式で定義すること:
     ```yaml
     overrides:
       source-map-js: ">=1.2.2"
       katex: ">=0.18.2"
     ```
  2. 後方互換および npm/ツール整合性のため、`package.json` にも `overrides` および `pnpm.overrides` を記述しておくこと。
  3. 設定更新後は `pnpm install` を実行して `pnpm-lock.yaml` にオーバーライド後の解決バージョンが反映されたことを確認し、`pnpm audit` が 0 件で合格することを確認すること。

### 3.23. Windows + Node.js v22/v24環境における子プロセスでのバッチ/cmdファイル（pnpm.cmd等）実行

- **事象・ミス**:
  - テストスクリプト（`.mjs`）から `child_process.execFileSync("pnpm.cmd", ["audit"])` や `spawnSync` を実行すると、`spawnSync pnpm.cmd EINVAL` エラーで失敗する。
  - 回避策として `{ shell: true }` を渡すと `[DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities...` の警告が発生する。
- **原因**:
  - Node.js の Windows コマンドインジェクション対策（CVE-2024-27980）により、Windows 上で `.cmd` / `.bat` スクリプトをシェルなし（`shell: false`）の `spawnSync` / `execFileSync` で引数付き実行することが拒否（`EINVAL`）される仕様となった。また、引数配列と `shell: true` の併用は引数エスケープの安全性の観点から非推奨警告の対象となった。
- **対策**:
  - Node.js スクリプト内から `pnpm audit` や `git` などの CLI ツールを同期実行する場合は、`child_process.execSync` を使用してコマンドライン文字列を渡すこと:
    ```javascript
    import { execSync } from "node:child_process";
    const output = execSync("pnpm audit", { cwd: projectRoot, encoding: "utf-8", stdio: "pipe" });
    ```
  - これにより、プラットフォーム間（Windows / Linux / macOS）の差異を吸収しつつ、`EINVAL` や `DEP0190` 警告なしにクリーンに実行・検証できる。

### 3.24. ソース直接編集モード（CodeMirror 6）のレイアウト崩れ・ガター分離と GFM/コード言語ハイライト・双方向Ref同期
- **事象・ミス**:
  1. ソース直接編集モードで `.cm-content` に `max-width: 960px; margin: 0 auto;` を設定した際、行番号ガター（`.cm-gutters`）がエディタ左端に固定されたままとなり、本文とガターの間に巨大な余白が発生して視線誘導が破壊される。
  2. フェンスドコードブロック（```ts, ```rust, ```python 等）を記述してもキーワードや文字列に色が着かず、単色のプレーンテキストのまま表示される。
  3. 「WYSIWYG表示に戻る」ボタン押下時に `setIsSourceMode(false)` のみ実行され `isSourceModeRef.current` が更新されず、以後のファイルオープンやタブ切替でモード状態の不整合が発生する。
- **原因**:
  - CodeMirror 6 の DOM 構造では `.cm-gutters` と `.cm-content` は兄弟要素として `.cm-scroller` 直下に配置されるため、`.cm-content` だけを中央揃えにするとガターと分離する。
  - `@codemirror/lang-markdown` のデフォルト `markdown()` は基本Markdownのみであり、`codeLanguages` や GFM 拡張を明示的に指定しないとコードブロック内のシンタックスハイライトが機能しない。
  - React の State と Ref の二重管理において、切り替えコールバックの更新漏れが生じたため。
- **対策**:
  1. `.cm-scroller` と `.cm-content` のレイアウト設計において、ガターと本文を分離させず、Typoraライクに一体化した等幅・快適パディング（`padding: 24px 32px` 等）のスタイルを定義すること。
  2. `markdown({ codeLanguages: languages })` を設定し、`@codemirror/language-data` による主要言語（JS/TS/Python/Rust/HTML/CSS/JSON/YAML等）の動的パーサーと GFM 構文拡張を有効化すること。
  3. `onExitSourceMode` および `handleToggleSourceMode` で必ず `isSourceModeRef.current = next` を同期更新し、WYSIWYG 切替時の未保存判定・生ソース完全保護を徹底すること。
  4. 切替前にアクティブエディタのスクロール位置（`.cm-scroller` または `.typori-editor-root .overflow-y-auto`）を `editorScrollTopRef` に退避し、切替先エディタの `initialScrollTop` プロップ経由で `requestAnimationFrame` により復元して画面の不自然な跳躍を防止すること。

### 3.25. @codemirror/language-data における言語名照合（matchLanguageName）と拡張子照合（matchFilename）の仕様差分
- **事象・ミス**:
  - テストスクリプトや言語動的解決処理で `LanguageDescription.matchLanguageName(languages, "py")` や `matchLanguageName(languages, "rs")` を呼び出すと `null` が返り、言語パーサーの取得に失敗する。
- **原因**:
  - CodeMirror 6 の `LanguageDescription` において、`matchLanguageName` は各言語定義の `name`（例: `"Python"`, `"Rust"`）および `alias` 配列（例: `["python"]`, `["rust"]`）とのみ照合を行う仕様である。
  - 短縮形や拡張子（`"py"`, `"rs"`, `"ts"`, `"js"` 等）は `alias` ではなく `extensions` 配列に格納されているため、`matchLanguageName` ではヒットしない。
- **対策**:
  1. 言語名やエイリアスによる照合を行う場合は、`LanguageDescription.matchLanguageName(languages, name, true)` を使用し、正規の言語名（`"python"`, `"rust"`, `"javascript"` 等）を指定すること。
  2. ファイル拡張子（`.py`, `.rs`, `.ts` 等）から言語パーサーを解決・検証する場合は、`LanguageDescription.matchFilename(languages, `dummy.${ext}`)` を使用すること。

### 3.26. 大容量ファイル（800KB/5000行+）オープン時の強制リフロー（Forced Reflow）防止とビューポート仮想化
- **事象・ミス**:
  - 800KB / 5000行を超える大容量 Markdown ファイルを開いた際、画面が数秒間完全にフリーズ（UIブロッキング）し、スクロール時にも顕著なコマ落ち・カクつき（FPS低下）が発生する。
- **原因**:
  - WYSIWYG エディタ（Milkdown / ProseMirror）の行番号プラグイン（`lineNumbersPlugin`）が、ドキュメント全体の全ブロック（数千ノード）に対して `view.coordsAtPos(pos)` を同期的ループで呼び出していたため。`coordsAtPos` はブラウザのレイアウトツリー計算を同期強制（Forced Reflow / Layout Thrashing）するため、ノード数に比例して指数関数的にメインスレッドを占有する。
  - 加えて、初回マウント時における全件シリアライズや、画面外の画像解決・アウトライン抽出の一斉同期実行が重複していたため。
- **対策**:
  1. 行番号ガター等の DOM 座標計算では、全ブロックを走査せず、ビューポート可視領域（`scrollTop` 〜 `scrollTop + clientHeight` ＋上下バッファ）内のブロックのみを対象に仮想化計算すること。
  2. 座標取得や DOM 更新はスクロールイベントごとに即時同期実行せず、`requestAnimationFrame` を用いて 1 フレーム内にデバウンス集約すること。
  3. 初回マウント時（`listenerCtx.mounted`）の不要な全件シリアライズを抑制し、ディスク上の正規化済みテキストをそのまま初期保存基準値として活用すること。
  4. 大容量ファイル（300KB/2000行以上）では、CodeMirror 6 の仮想スクロール特性を活かした高速オープン連携をサポートすること。

### 3.27. アウトライン抽出・ローカル画像解決・Mermaidダイアグラムの遅延ロード最適化（オープン初期負荷軽減）
- **事象・ミス**:
  - 大容量Markdownファイルを開いた際、右サイドバーの見出し抽出処理（`extractOutline`）やローカル画像ファイル解決（`resolveImagesInDOM`）、および多数のMermaidダイアグラム（`renderMermaidSvg`）がファイルオープン直後に一斉同期実行され、CPU・メインスレッドが飽和して初期表示が遅延したりタイピングがもたつく。
- **原因**:
  - アウトライン抽出がコンポーネントレンダリングごとに同期実行されていたため。
  - 画像解決がDOM内の全画像を対象とし、MutationObserver でも無制限に発火していたため。
  - MermaidNodeView がコンストラクタ内で即座に全件SVGレンダリングを行っていたため。
- **対策**:
  1. `OutlineSidebar`: コンテンツ変更時のアウトライン抽出にデバウンス（`OUTLINE_DEBOUNCE_MS = 150`）を適用し、タイピング中や初期表示時の同期パースを抑制すること。
  2. `resolveImagesInDOM`: ビューポート近傍（上下400pxバッファ）の可視画像を優先解決し、画面外画像はスクロール連動デバウンス（150ms）およびアイドル時（500ms遅延）に段階解決すること。また重複解決中フラグ（`resolvingImagesRef`）で多重読み込みを防止すること。
### 3.28. Node.js テストスクリプト（`.mjs`）から React/JSX コンポーネント（`.tsx`）を直接 `import` することによる `ERR_UNKNOWN_FILE_EXTENSION` エラー
- **事象・ミス**:
  - テストスクリプト（`.mjs`）から `import("../src/components/Editor/Editor.tsx")` のように `.tsx` ファイルを動的インポートしようとすると、`TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".tsx"` で失敗する。
- **原因**:
  - Node.js は JSX/TSX 構文をネイティブにサポートしておらず、トランスパイラ（Vite / Babel / tsx）を通さずに `node scripts/*.mjs` を直接実行する場合、拡張子 `.tsx` は未知の形式として拒否される。
  - 一方で、JSX を含まない純粋な TypeScript ファイル（`.ts`）は、Node 22/24 の実験的型ストリッピング機能等により直接インポート可能な場合があるため、`.ts` と混同して `.tsx` をインポートしてしまうミスが発生しやすい。
- **対策**:
  1. テストスクリプト内では、React コンポーネント（`.tsx`）を直接 `import()` せず、`fs.readFileSync` による静的構造・エクスポート・実装検査を行うこと。
  2. `.tsx` 内のロジック（二分探索、仮想化計算、シミュレーション等）を動的にテストする場合は、純粋ロジック部分を `src/utils/*.ts` などの `.ts` モジュールに抽出してインポートするか、テストスクリプト側で同一アルゴリズムのシミュレーション関数を定義して振る舞いを検証すること。

### 3.29. 書式クリア（Clear Formatting / Bare）機能の実装・検証における状態整合性と空選択ガード・遅延ロードRef連携
- **事象・ミス**:
  1. テキストを選択していないキャレット状態（`selection.empty` / `from === to`）で「書式をクリア」を実行した際、ドキュメント全体が置換されたり、不要な変更履歴（Undoスタック）が積まれて未保存フラグが誤爆する。
  2. 遅延ロード（`React.lazy`）されている `SourceEditor` コンポーネントに対して、`App.tsx` から通常インポートで Ref 型を取り込もうとしたり、`useImperativeHandle` のメソッド呼び出しがオプショナルチェーン（`?.`）なしで行われて未マウント時にランタイムエラーとなる。
  3. テストスクリプトにおいて `ClearFormattingResult` のプロパティ名を誤認（`hasChanged` / `newText` と推測して不一致エラー）する。
- **原因**:
  - ProseMirror および CodeMirror 6 において、空選択時のハンドリングを行わずにトランザクションを発行すると、`tr.removeMark` はエラーにならなくても `userEvent` や履歴に差分が記録されてしまう。
  - `SourceEditor` は起動高速化のため `lazy(() => import(...))` されており、型定義のみ `import type { SourceEditorRef }` で明示的にインポートする必要がある。
  - `src/utils/format.ts` の返却型は `{ text: string, from: number, to: number, changed: boolean }` として厳密に定義されている。
- **対策**:
  1. WYSIWYG（`clearWysiwygFormatting`）およびソース直接編集（`clearFormatting`）のいずれにおいても、先頭で必ず空選択ガード（`selection.empty || selection.from === selection.to` 等）を判定し、空の場合は即座に `false` を返却してトランザクション発行を抑止すること。
  2. `App.tsx` では `import type { SourceEditorRef } from "./components/Editor/SourceEditor"` により型のみを安全にインポートし、動的ディスパッチ時は `sourceEditorRef.current?.clearFormatting()` / `editorRef.current?.clearFormatting()` と安全に呼び出すこと。
  3. 書式クリアの純粋関数（`clearInlineFormatting`）を検証する際は、`changed: boolean` および `text: string` のプロパティ名に準拠してアサーションを行うこと。

### 3.30. ソース直接編集モードのレイアウト・インデント・縦スクロールおよびOSネイティブメニューSubmenuチェック同期
- **事象・ミス**:
  1. ソース直接編集モードで画面全体に横長に広がり視認性が悪化する、または `.cm-content` のみに中央揃えを適用してガターと本文が乖離してしまう。
  2. 行番号OFF時やリサイズ時に `.cm-content` の幅が潰れる（問題点A）。
  3. 長文編集時に `.cm-scroller` が親要素の高さを突き抜け、最下部までスクロールできなくなる（問題点B）。
  4. Tab キーを押すとインデントが挿入されずエディタからブラウザのフォーカスが外れてしまう、または行頭の連続空白が詰まってネストリストのインデントが潰れて見える（課題2 & 3）。
  5. フロントエンドで行番号表示を切り替えた際、OSネイティブメニュー「表示」内の「行番号を表示」チェックボックスにチェック状態が反映されない（問題点C）。
- **原因**:
  1. CodeMirror 6 においてガターと本文は `.cm-scroller` 内の兄弟要素であり、コンテンツ要素のみにマージンを設定すると分離する。
  2. `.cm-content` の Flexbox 幅縮小制約（`min-width: 0`, `flex-grow: 1`, `width: 100%`）の不足、および `.cm-scroller` の `max-height: 100%` 制約不足。
  3. CodeMirror 6 のデフォルトキーマップに `@codemirror/commands` の `indentWithTab` が組み込まれていないため、Tab キーがブラウザ標準のフォーカス移動として捕捉されてしまう。また CSS で行頭空白の保持（`break-spaces`）が明示されていない。
  4. Tauri v2 の `Menu::get(id)` はルートメニュー直下のアイテムのみを参照し、`Submenu` の内部アイテムを自動で再帰走査しないため、サブメニュー内の `CheckMenuItem` の取得に失敗する。
- **対策**:
  1. ソース直接編集モードの中央寄せは、ガターと本文の一体感を維持する最大幅レイアウト（`max-width: 900px; margin: 0 auto;`）を設計・適用すること。
  2. `.cm-content` に `min-width: 0`, `flex-grow: 1`, `width: 100%` を設定して幅潰れを防止し、`.cm-scroller` に `height: 100%`, `max-height: 100%`, `overflow-y: auto` を適用してスクロール健全性を確立すること。
  3. `SourceEditor.tsx` の extensions に `keymap.of([indentWithTab])`（またはキーマップ定義内）を組み込み、Tab / Shift+Tab によるインデント・アンインデントを有効化すること。また `.cm-content` / `.cm-line` に `white-space: break-spaces` を適用して行頭空白を完全に保護すること。
  4. `src-tauri/src/menu.rs` に `Submenu` を再帰的にトラバースするヘルパー関数 `find_check_menu_item` を実装し、`set_line_numbers_menu_checked` でサブメニュー配下の `CheckMenuItem` を確実に取得して `set_checked` を実行すること。

### 3.31. Windows環境における `tauri = { features = ["test"] }` 導入時の `0xc0000139` (STATUS_ENTRYPOINT_NOT_FOUND) クラッシュとヘッドレステスト設計
- **事象・ミス**:
  - `Cargo.toml` の `[dev-dependencies]` に `tauri = { version = "2", features = ["test"] }` を追加して `tauri::test::mock_app()` を単体テスト内で使おうとすると、Windows 環境で `cargo test` 実行時にテストバイナリが `0xc0000139 (STATUS_ENTRYPOINT_NOT_FOUND)` で即時異常終了する。
- **原因**:
  - Windows 環境では、Tauri の `test` フィーチャーが WebView2 や特定のネイティブ GUI / OS DLL エントリポイントに暗黙依存するため、CLI（PowerShell）からのヘッドレスな `cargo test` 実行環境でシンボル解決に失敗する。
- **対策**:
  1. `src-tauri/Cargo.toml` に `tauri` の `test` フィーチャーを追加しないこと。
  2. メニュー走査やデータツリー探索などのロジックは、Tauri のランタイムハンドルに依存しない純粋なジェネリック再帰探索ヘルパー（例: `find_in_menu_tree`）としてコアロジックを抽出し、モックデータ構造を用いて単体テストを安全かつ高速に検証すること。
  3. 実機でのメニュー整合性やIPCコマンド検証は、既存の `scripts/verify-native-menu.mjs` および総合結合テストスイート（`pnpm test` / `scripts/verify-all.mjs`）で網羅検証すること。

### 3.32. ソース直接編集モードの行番号ガター縦落ち・スクロール不能および生ソースインデント破壊の防止
- **事象・ミス**:
  1. ソース直接編集モードにおいて、行番号ガター（`.cm-gutters`）の下に本文（`.cm-content`）が縦落ちして表示され、エディタレイアウトが縦積みに崩壊する。
  2. 長文ドキュメントを開いた際、マウスホイールやスクロールバーによる縦スクロールが効かなくなる。
  3. インデント付きのネストリスト（`- 親\n  - 子` 等）を含むファイルを開いただけで、未編集にもかかわらず生ソースのインデントが崩れたり、モード切り替えでフォーマットが勝手に変形する。
- **原因**:
  1. `.cm-content` に `width: 100%` を指定したため、`.cm-gutters` の幅（約50px）と合計してコンテナ幅（100%）を超過し、Flexbox の折り返し・縦落ちが発生していた。
  2. `.cm-scroller` に `max-height: 100%` や複数の競合する overflow 指定（`overflow: auto`, `overflow-y: auto`）を適用したため、CodeMirror 6 の内部仮想スクロール測定（`view.measure()` / `scrollDOM`）と干渉しスクロール機能が停止していた。
  3. Milkdown のマウント完了イベント（`listenerCtx.mounted`）において、初回シリアライズ結果で `fileContentRef` および `savedContentRef` を無差別に上書きしていたため、ディスク上の生ソースが破壊されていた。
- **対策**:
  1. `.cm-content` から `width: 100%` を完全撤廃し、`.cm-scroller` に `display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: flex-start !important;` を明示して横並びを強制すること。
  2. `.cm-scroller` は CodeMirror 6 標準の `height: 100%; overflow: auto; box-sizing: border-box;` に統一し、過剰な `max-height` を指定しないこと。
  3. 未編集のクリーンなファイルにおいては、Milkdown マウント時シリアライズによる生ソースの上書きを一切行わず、ディスクから読み込んだテキストを 100% 保持すること。また Markdown シリアライザ（`remarkStringifyOptionsCtx`）でネストリストのインデント保持を徹底すること。

### 3.33. 修飾キー付きショートカット押下による未保存（`hasUserInteracted`）誤爆と二重中央寄せレイアウト干渉の防止
- **事象・ミス**:
  1. ファイルを開いて未編集のまま `Ctrl + /` を押してソース直接編集モードに切り替えた瞬間、生ソースのインデント（2スペース・4スペース等）がすべて左揃えに破壊される。
  2. ソース直接編集モードにおいて、CodeMirror 外側ラッパーと内側 `.cm-editor` の二重 `max-width` 指定によりレイアウトが歪み、縦スクロール不能やガター縦落ちが再発する。
- **原因**:
  1. `Editor.tsx` の `handleKeyDown` において、`Ctrl + /` などのショートカットキー押下時に修飾キー判定が漏れており、単なるショートカット操作を「ユーザーによるコンテンツ改変（`hasUserInteracted = true`）」と誤認していたため。
  2. 外側コンテナと内側コンテナ双方に幅制約・マージンが二重に適用され、CodeMirror 6 の仮想スクロールコンテナが親の境界を正しく認識できなくなっていたため。
- **対策**:
  1. `Editor.tsx` の `handleKeyDown` では、`e.ctrlKey || e.metaKey || e.altKey` を含むキー押下での `markUserInteracted()` 呼び出しを一律禁止し、通常文字入力や改変キー（Enter, Backspace 等）のみに限定すること。
  2. `SourceEditor.tsx` の外側ラッパーは画面幅一杯（`w-full h-full`）とし、中央寄せ最大幅は `.cm-editor` のみで一元管理すること。

---

## 4. OS・シェル非依存実行ガイドライン（Windows環境での作業規則）

本プロジェクトは Windows 環境で開発されています。エージェントは以下のルールを厳守してください。

1. **コマンド実行前の思考プロセス (CoT)**:
   - ホストOS（Windows）とシェル（PowerShell）を常に意識すること。
   - POSIX 固有コマンド（`rm -rf`, `cat`, `ls`, `mkdir -p` 等）を直接実行しないこと。
2. **シェルリダイレクト（`>` / `>>`）の厳禁**:
   - PowerShell の `>` は UTF-16LE で出力され文字化けの原因となるため禁止。ファイルの新規作成・編集は組み込みツール（`write_to_file`, `replace_file_content`）を使用すること。
3. **インラインワンライナーの禁止（Script-First 原則）**:
   - `node -e "..."` や `powershell -Command "..."` はクォートエスケープ事故が多発するため禁止。複数行の処理や検証は `scripts/` 配下に `.mjs` ファイルを作成して `node scripts/...` で実行すること。

---

## 5. ガードレールの保守・更新手順
1. **発見・追記**:
   作業中に想定外の不具合、ビルドエラー、テスト失敗、環境特有のハマりどころに遭遇し解決した場合は、必ず本ドキュメントの「3. プロジェクト固有のガードレール集」に以下のフォーマットで追記すること:
   - **事象・ミス**: 何が起きたか
   - **原因**: なぜ起きたか（根本原因）
   - **対策**: 今後再発させないための実装ルール・検証手順
2. **テストスクリプトの整備**:
   再発防止ルールを策定したら、可能な限り `scripts/verify-*.mjs` に自動検証を追加し、`scripts/verify-all.mjs` に組み込むこと。
