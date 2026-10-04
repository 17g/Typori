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
   - `scripts/verify-all.mjs` により、全個別機能テスト（27件）、Tauri IPC コマンド登録整合性（14コマンド）、OSネイティブメニューイベント整合性（16イベント）、ショートカット定義の整合性を網羅検証する。
2. **フロントエンド型検査 & ビルド検証**:
   ```powershell
   pnpm run build
   ```
   - TypeScript コンパイル（`tsc`）および Vite プロダクションビルドにエラーがないことを確認する。
3. **バックエンド単体テスト & 静的解析**:
   ```powershell
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
