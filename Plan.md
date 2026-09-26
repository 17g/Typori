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
- [ ] 13. UI調整: Typoraライクなヘッダーレス・ミニマルレイアウトへのリファクタリング（サイドバーのトグル開閉など）
- [ ] 14. 新規ファイル作成機能: サイドバーから新規Markdownファイルを作成するUIとバックエンド処理の追加
- [ ] 15. テーマ機能: Tailwind CSS を活用したライト/ダークテーマの切り替え機能の実装
- [ ] 16. OS連携: Tauriの機能を用いたOSネイティブメニューの構築（保存、新規作成など）

## Phase 6: リリース準備
- [ ] 17. 最終ビルド確認とインストーラの作成 (`pnpm tauri build`)
