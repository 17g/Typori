# Typori リリースビルド手順書 (Release Guide)

本ドキュメントは、Typori の本番リリースビルドを作成し、配布用パッケージ（インストーラ・ポータブルバイナリ）を生成するための標準手順およびチェックリストです。

---

## 1. リリース前の事前検証 (Pre-flight Checks)

リリースビルドを行う前に、以下の検証をすべて実施し、すべて Exit Code 0（エラーおよび警告なし）であることを確認します。

### 1-1. バックエンド (Rust) 検証
```powershell
# 単体テスト (24件全パス)
cargo test --manifest-path src-tauri/Cargo.toml

# 静的解析・Linter (警告0件)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# リリースプロファイルでのコンパイル事前チェック
cargo check --release --manifest-path src-tauri/Cargo.toml
```

### 1-2. フロントエンド (TypeScript/React) 検証
```powershell
# 型チェックおよびプロダクションバンドル生成
pnpm run build
```

### 1-3. 総合結合テストスイート
```powershell
# 全機能結合テスト、Tauri IPC整合性、OSネイティブメニュー整合性、ショートカット競合検証
pnpm test
# または
node scripts/verify-all.mjs
```

---

## 2. バージョン番号の管理

新バージョンをリリースする場合は、以下の2ファイルのバージョン番号を同期して更新してください。

1. **`src-tauri/tauri.conf.json`**:
   ```json
   "version": "0.1.0"
   ```
2. **`package.json`**:
   ```json
   "version": "0.1.0"
   ```
3. **`src-tauri/Cargo.toml`**:
   ```toml
   version = "0.1.0"
   ```

---

## 3. リリースビルドの実行コマンド

以下のいずれかのコマンドを実行することで、自動的にフロントエンドのビルド・RustのLTO最適化コンパイル・インストーラパッケージングが実行されます。

### 推奨コマンド (テスト自動実行 + ビルド)
```powershell
pnpm run build:release
```

### 単独ビルドコマンド
```powershell
pnpm tauri build
```

※ 特定のバンドル形式のみを生成したい場合:
- NSIS インストーラのみ: `pnpm tauri build -b nsis`
- MSI インストーラのみ: `pnpm tauri build -b msi`

---

## 4. ビルド成果物の出力場所

ビルドが完了すると、以下のディレクトリに各種バイナリおよびインストーラが配置されます。

| 成果物種別 | ファイルパス | 用途 |
| :--- | :--- | :--- |
| **NSIS インストーラ (.exe)** | `src-tauri/target/release/bundle/nsis/Typori_{version}_x64-setup.exe` | 一般ユーザー向けセットアップ実行ファイル |
| **WiX インストーラ (.msi)** | `src-tauri/target/release/bundle/msi/Typori_{version}_x64_en-US.msi` | 企業・エンタープライズ・GPO配布向け |
| **ポータブル実行ファイル (.exe)** | `src-tauri/target/release/typori.exe` | インストール不要のスタンドアロン実行ファイル |

---

## 5. リリース配布前の動作確認チェックリスト

生成されたインストーラまたは実行ファイルを起動し、以下の基本動作を確認します。

- [ ] インストーラが正常に起動し、デスクトップまたはスタートメニューにショートカットが作成されること
- [ ] アプリケーション起動時にヘッダーレスなTyporaライクウィンドウが中央に表示されること
- [ ] 左サイドバーでファイルツリーの閲覧、検索、新規作成ができること
- [ ] MilkdownエディタでWYSIWYG編集および保存 (`Ctrl+S`) が正常に行えること
- [ ] ソース直接編集モード (`Ctrl+/`) およびフォーカスモード (`F8`) が正常にトグルできること
- [ ] HTMLエクスポート (`Ctrl+Shift+E`) およびPDFエクスポート (`Ctrl+Shift+P`) が機能すること
- [ ] チートシート (`F1`) およびショートカット設定画面 (`Ctrl+,`) が開閉できること
