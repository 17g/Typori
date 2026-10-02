# Typori (タイポリ)

> **Typoraライクな高速・高機能・ミニマルなローカルMarkdownエディタ**

Typori は、Rust (Tauri v2) と React 19、Milkdown、CodeMirror 6 で構築された、デスクトップ向けローカルMarkdownエディタです。
「思考を邪魔しない、美しい執筆空間」をコンセプトに、軽量かつシームレスなWYSIWYG編集体験と強力なファイル管理・エクスポート機能を提供します。

---

## ✨ 主な特徴

- ⚡ **超高速・軽量なデスクトップ体験**:
  - バックエンドに Rust + Tauri v2 を採用し、低メモリ消費と高速起動を実現。
  - OSネイティブなファイルI/Oとウィンドウ管理。
- 📝 **シームレスなWYSIWYG Markdown編集**:
  - Milkdown (ProseMirrorベース) によるリアルタイムWYSIWYGライクな編集。
  - リスト（箇条書き `-`、番号付きリスト `1.` 連番）、表（テーブル）、引用、リンクの視覚的編集。
  - 表の作成・行列編集・サイズ変更をGUI上で直感的に操作可能。
  - 水平線の統一 (`---`)、Markdownシリアライズの規格統一・保護。
- 💻 **ソースコード直接編集モード**:
  - CodeMirror 6 による本格的なMarkdownソースコード直接編集。
  - ショートカット (`Ctrl + /`) またはメニューからワンタッチでWYSIWYGとソース編集を双方向同期切替。
- 🎯 **フォーカスモード**:
  - カーソルが存在する行・ブロック以外を滑らかに暗くし、執筆中の思考に没入（デフォルト: `F8`）。
- 🗂️ **柔軟なファイル管理 & タブ機能**:
  - 左サイドバーによる階層型フォルダツリー表示。
  - サイドバー内でのインクリメンタルファイル名検索（未展開フォルダの自動オープン & ハイライト）。
  - OSネイティブなD&Dによる外部 `.md` ファイルのドラッグ＆ドロップ読み込み。
  - 複数ファイルを同時に作業できるタブ機能（デフォルトは単一ファイル、設定やメニューから有効化可能）。
- 🖼️ **ローカル画像の一元管理 & 自動解決**:
  - エディタへの画像ファイル（PNG/JPG/SVG/GIF等）D&Dによる自動 `assets/` フォルダ保存。
  - ローカル相対パス画像の高速Blobプレビュー表示。
- 📄 **高品質エクスポート**:
  - **HTMLエクスポート**: pulldown-cmark による完全スタンドアロンHTML出力（ライト/ダークテーマCSS内蔵、印刷最適化）。
  - **PDFエクスポート**: `@page` や `@media print` に最適化されたCSSとOS印刷ダイアログ連携による美しいPDF保存。
- 📑 **アウトライン（右サイドバー）**:
  - ドキュメント内の見出し（H1〜H6）をリアルタイムに解析し、ツリー構造で一覧表示。
  - 見出しクリックで該当ブロックへスムーズスクロール＆パルスハイライトジャンプ。
- 🎨 **テーマシステム**:
  - ライトテーマ / ダークテーマ / OSシステム連動に対応（Tailwind CSS）。
- ⌨️ **ショートカットカスタマイズ & チートシート**:
  - 全ショートカットキーのカスタマイズ画面（`Ctrl + ,`）と競合検知・永続化。
  - Markdown記法およびショートカット一覧を確認できるチートシート（`F1`）。

---

## ⌨️ デフォルトショートカットキー一覧

| 機能 | ショートカット |
| :--- | :--- |
| **ファイル新規作成** | `Ctrl + N` |
| **ファイル保存** | `Ctrl + S` |
| **ファイル検索** | `Ctrl + F` |
| **ソース直接編集モード切替** | `Ctrl + /` |
| **フォーカスモード切替** | `F8` |
| **タブ機能有効/無効切替** | `Ctrl + Shift + T` |
| **右サイドバー（アウトライン）切替** | `Ctrl + Shift + O` |
| **HTML形式エクスポート** | `Ctrl + Shift + E` |
| **PDF形式エクスポート (印刷)** | `Ctrl + Shift + P` / `Ctrl + P` |
| **ショートカット設定画面** | `Ctrl + ,` |
| **チートシート表示** | `F1` / `Ctrl + Shift + ?` |
| **タブを閉じる (タブ有効時)** | `Ctrl + W` |

---

## 🛠️ 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| **OS / バックエンド** | Rust, Tauri v2 |
| **フロントエンド** | React 19, TypeScript, Vite |
| **エディタコア** | Milkdown (ProseMirror), CodeMirror 6 |
| **スタイリング** | Tailwind CSS v4 |
| **パーサー / 変換** | pulldown-cmark, remark-stringify, mdast |
| **パッケージマネージャ** | pnpm, Cargo |

---

## 🚀 開発環境のセットアップ

### 前提条件
- **Node.js**: v18以上 (推奨: v20以上)
- **pnpm**: v9以上
- **Rust**: 1.77以上 (`rustup`)
- **Windows**: Microsoft C++ Build Tools (MSVC), WebView2

### インストールと起動
```powershell
# 依存パッケージのインストール
pnpm install

# 開発モードの起動 (ホットリロード対応)
pnpm tauri dev
```

### テスト・品質検証
```powershell
# フロントエンドビルド確認
pnpm run build

# バックエンド単体テスト
cargo test --manifest-path src-tauri/Cargo.toml

# 総合結合テストスイート実行
pnpm test
```

---

## 📦 リリースビルドとインストーラ作成

本プロジェクトは Tauri v2 のバンドラー機能を利用して、Windows 向けのインストーラ（NSIS `.exe` / WiX `.msi`）および最適化バイナリを自動生成します。

```powershell
# テスト実行後にリリースビルドを実行
pnpm run build:release

# または直接 Tauri build を実行
pnpm tauri build
```

### 生成成果物の出力先
- **NSIS インストーラ (`.exe`)**:  
  `src-tauri/target/release/bundle/nsis/Typori_{version}_x64-setup.exe`
- **WiX インストーラ (`.msi`)**:  
  `src-tauri/target/release/bundle/msi/Typori_{version}_x64_en-US.msi`
- **ポータブル実行ファイル (`.exe`)**:  
  `src-tauri/target/release/typori.exe`

---

## 📄 ライセンス

Copyright © 2026 Typori. All rights reserved.
