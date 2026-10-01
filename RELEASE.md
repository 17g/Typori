# Typori リリースガイド & ビルド成果物

Typori（タイポリ）のリリースビルド手順および生成された成果物の概要です。

---

## 1. ビルド成果物一覧 (Windows x64)

| 成果物名 | 形式 | 配置先 | ファイルサイズ | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **NSIS インストーラ** | `.exe` | `src-tauri/target/release/bundle/nsis/Typori_0.1.0_x64-setup.exe` | 約 1.87 MB | 一般ユーザー向け標準インストーラ（スタートメニュー登録・アンインストーラ同梱） |
| **WiX MSI パッケージ** | `.msi` | `src-tauri/target/release/bundle/msi/Typori_0.1.0_x64_en-US.msi` | 約 2.55 MB | 企業・組織環境向けWindows Installerパッケージ（サイレントインストール・ポリシー配布対応） |
| **スタンドアロン実行ファイル** | `.exe` | `src-tauri/target/release/typori.exe` | 約 4.94 MB | ポータブル実行ファイル（インストール不要で単体実行可能） |

---

## 2. ワンコマンド リリースビルド手順

全機能の結合テスト・整合性チェックを実施した上でリリースバイナリとインストーラを生成します：

```bash
# 全テスト自動実行 ＋ フロントエンド本番ビルド ＋ Rustリリース最適化 ＋ パッケージング
pnpm run build:release
```

※ 通常のTauriビルドのみ実行する場合：
```bash
pnpm tauri build
```

---

## 3. リリースビルドの最適化設定

`src-tauri/Cargo.toml` の `[profile.release]` にて以下の最適化を実施しています：
- **`opt-level = 3`**: 最高度のアグレッシブ最適化
- **`lto = true`**: Link-Time Optimization（全プログラムを対象としたクロスモジュール最適化）
- **`codegen-units = 1`**: 単一コード生成ユニットによるインライン展開効率の最大化
- **`panic = "abort"`**: パニック時のアンワインドメタデータ削除によるバイナリ軽量化
- **`strip = true`**: デバッグシンボルのストリップによるファイルサイズ最小化

---

## 4. リリース前の品質検証項目 (Quality Checklist)

以下のすべてが正常終了（Exit Code 0）することを確認しています：
- [x] **総合結合テスト (`pnpm test`)**: 全17件の機能テスト、Tauri IPC 14コマンド、OSメニュー16イベント、ショートカット定義競合なし
- [x] **フロントエンド型チェック・ビルド (`pnpm run build`)**: TypeScript `tsc` および Vite バンドル生成
- [x] **バックエンド単体テスト (`cargo test`)**: 24 tests passed
- [x] **バックエンド静的解析 (`cargo check` & `cargo clippy`)**: 警告・エラーゼロ
- [x] **バンドル生成 (`pnpm tauri build`)**: NSIS Setup `.exe` および WiX `.msi` の生成完了
