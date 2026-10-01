import { ShortcutItem, MarkdownSyntaxItem } from "./types";

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  // ファイル・タブ操作
  {
    id: "new_file",
    name: "新規ファイル作成",
    keys: ["Ctrl", "N"],
    description: "新規Markdownファイルを作成します",
    category: "file",
  },
  {
    id: "save_file",
    name: "ファイル保存",
    keys: ["Ctrl", "S"],
    description: "編集中のファイルを保存します",
    category: "file",
  },
  {
    id: "export_html",
    name: "HTML形式でエクスポート",
    keys: ["Ctrl", "Shift", "E"],
    description: "編集中のMarkdownファイルをHTML形式でエクスポートします",
    category: "file",
  },
  {
    id: "export_pdf",
    name: "PDF形式でエクスポート (印刷)",
    keys: ["Ctrl", "Shift", "P"],
    description: "編集中のMarkdownファイルを印刷ダイアログ連携によりPDF形式でエクスポートします",
    category: "file",
  },
  {
    id: "close_tab",
    name: "タブを閉じる",
    keys: ["Ctrl", "W"],
    description: "現在開いているタブを閉じます",
    category: "file",
  },
  {
    id: "toggle_tabs",
    name: "タブ機能の有効/無効",
    keys: ["Ctrl", "Shift", "T"],
    description: "タブバーの表示と複数ファイルオープン機能を切り替えます",
    category: "file",
  },

  // 表示・モード切替
  {
    id: "toggle_sidebar",
    name: "サイドバー表示切替",
    keys: ["Ctrl", "\\"],
    description: "左側のファイルツリーサイドバーの表示・非表示を切り替えます",
    category: "view",
  },
  {
    id: "toggle_source_mode",
    name: "ソース直接編集モード切替",
    keys: ["Ctrl", "/"],
    description: "WYSIWYGエディタとMarkdownソースコードエディタを切り替えます",
    category: "view",
  },
  {
    id: "toggle_focus_mode",
    name: "フォーカスモード切替",
    keys: ["F8"],
    description: "カーソルがある行以外を暗くし執筆に集中するモードを切り替えます",
    category: "view",
  },
  {
    id: "open_cheatsheet",
    name: "チートシート表示",
    keys: ["F1"],
    description: "Markdown記法とショートカットキーのチートシートを表示します",
    category: "view",
  },

  // Markdown挿入・書式
  {
    id: "insert_link",
    name: "リンクの挿入・編集",
    keys: ["Ctrl", "K"],
    description: "リンク挿入ダイアログを開き、URLやタイトルを設定します",
    category: "format",
  },
  {
    id: "toggle_blockquote",
    name: "引用の切り替え",
    keys: ["Ctrl", "Shift", "Q"],
    description: "カーソル行または選択範囲を引用ブロックに変換します",
    category: "format",
  },
  {
    id: "insert_table",
    name: "表（テーブル）の挿入",
    keys: ["Ctrl", "Alt", "T"],
    description: "3×3のGFMテーブルを挿入します",
    category: "format",
  },
  {
    id: "bold",
    name: "太字（ボールド）",
    keys: ["Ctrl", "B"],
    description: "選択テキストを太字にします",
    category: "format",
  },
  {
    id: "italic",
    name: "斜体（イタリック）",
    keys: ["Ctrl", "I"],
    description: "選択テキストを斜体にします",
    category: "format",
  },

  // 編集履歴
  {
    id: "undo",
    name: "元に戻す (Undo)",
    keys: ["Ctrl", "Z"],
    description: "直前の変更を取り消します",
    category: "edit",
  },
  {
    id: "redo",
    name: "やり直し (Redo)",
    keys: ["Ctrl", "Y"],
    description: "取り消した変更をやり直します (Ctrl+Shift+Z も利用可能)",
    category: "edit",
  },
];

export const MARKDOWN_SYNTAX_ITEMS: MarkdownSyntaxItem[] = [
  // 基本書式
  {
    id: "heading_1",
    name: "見出し 1 (H1)",
    syntax: "# 大見出し",
    description: "最も大きな見出しを作成します",
    category: "basic",
  },
  {
    id: "heading_2_3",
    name: "見出し 2〜3 (H2, H3)",
    syntax: "## 中見出し\n### 小見出し",
    description: "階層構造を持つ見出しを作成します（最大 ###### H6 まで対応）",
    category: "basic",
  },
  {
    id: "bold",
    name: "太字 (Bold)",
    syntax: "**太字のテキスト**",
    description: "文字を強調して太字にします",
    category: "basic",
  },
  {
    id: "italic",
    name: "斜体 (Italic)",
    syntax: "*斜体のテキスト*",
    description: "文字を斜体にします",
    category: "basic",
  },
  {
    id: "strikethrough",
    name: "取り消し線 (Strikethrough)",
    syntax: "~~取り消し線~~",
    description: "文字の中央に取り消し線を引きます",
    category: "basic",
  },
  {
    id: "inline_code",
    name: "インラインコード",
    syntax: "`console.log('Hello');`",
    description: "文中にコードやコマンドを等幅フォントで埋め込みます",
    category: "basic",
  },

  // リスト・項目
  {
    id: "unordered_list",
    name: "箇条書きリスト",
    syntax: "- 項目 1\n- 項目 2\n  - ネスト項目",
    description: "記号（- または *）による順序なしリスト",
    category: "lists",
  },
  {
    id: "ordered_list",
    name: "番号付きリスト",
    syntax: "1. 最初のステップ\n2. 次のステップ\n3. 最後のステップ",
    description: "数字とピリオドによる順序付きリスト",
    category: "lists",
  },
  {
    id: "task_list",
    name: "タスクリスト (チェックボックス)",
    syntax: "- [ ] 未完了タスク\n- [x] 完了タスク",
    description: "チェック可能なToDoタスク項目",
    category: "lists",
  },

  // ブロック・区切り
  {
    id: "blockquote",
    name: "引用ブロック",
    syntax: "> これは引用されたテキストです。\n> 複数行にわたって記述できます。",
    description: "他者の発言や参考テキストを引用表示します",
    category: "blocks",
  },
  {
    id: "code_block",
    name: "フェンスドコードブロック",
    syntax: "```typescript\nfunction hello(name: string): string {\n  return `Hello, ${name}!`;\n}\n```",
    description: "言語指定によるシンタックスハイライト付きの複数行コードブロック",
    category: "blocks",
  },
  {
    id: "horizontal_rule",
    name: "水平線（区切り線）",
    syntax: "---",
    description: "コンテンツのセクションを区切る水平線を描画します",
    category: "blocks",
  },

  // 発展・構造化
  {
    id: "link",
    name: "リンク",
    syntax: "[Typori 公式サイト](https://example.com)",
    description: "外部URLまたは内部ドキュメントへのリンクを作成します",
    category: "advanced",
  },
  {
    id: "image",
    name: "画像",
    syntax: "![Typori ロゴ](assets/logo.png)",
    description: "ローカル相対パスまたはWebの画像を埋め込み表示します",
    category: "advanced",
  },
  {
    id: "table",
    name: "表（テーブル）",
    syntax: "| ヘッダー 1 | ヘッダー 2 |\n| :--- | :---: |\n| 左揃えセル | 中央揃えセル |",
    description: "行と列による表組み（GFM仕様）を作成します",
    category: "advanced",
  },
];

export const SHORTCUT_CATEGORIES = [
  { id: "all", label: "すべて" },
  { id: "file", label: "ファイル・タブ" },
  { id: "view", label: "表示・モード" },
  { id: "format", label: "Markdown書式" },
  { id: "edit", label: "編集履歴" },
] as const;

export const MARKDOWN_CATEGORIES = [
  { id: "all", label: "すべて" },
  { id: "basic", label: "基本書式" },
  { id: "lists", label: "リスト・タスク" },
  { id: "blocks", label: "ブロック・引用" },
  { id: "advanced", label: "リンク・表・画像" },
] as const;
