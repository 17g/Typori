export type ShortcutCategory = "all" | "file" | "view" | "format" | "edit";

export interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  category: "file" | "view" | "format" | "edit";
  defaultKeys: string[];
}

export type ShortcutConfig = Record<string, string[]>;

export interface ShortcutConflict {
  actionId: string;
  conflictingActionId: string;
  keys: string[];
}

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  // ファイル・タブ操作
  {
    id: "new_file",
    name: "新規ファイル作成",
    description: "新規Markdownファイルを作成します",
    category: "file",
    defaultKeys: ["Ctrl", "N"],
  },
  {
    id: "save_file",
    name: "ファイル保存",
    description: "編集中のファイルをディスクに保存します",
    category: "file",
    defaultKeys: ["Ctrl", "S"],
  },
  {
    id: "close_tab",
    name: "タブを閉じる",
    description: "現在アクティブなタブを閉じます",
    category: "file",
    defaultKeys: ["Ctrl", "W"],
  },
  {
    id: "toggle_tabs",
    name: "タブ機能の有効/無効",
    description: "タブバーの表示と複数ファイルオープン機能を切り替えます",
    category: "file",
    defaultKeys: ["Ctrl", "Shift", "T"],
  },

  // 表示・モード切替
  {
    id: "toggle_sidebar",
    name: "サイドバー表示切替",
    description: "左側のファイルツリーサイドバーの表示・非表示を切り替えます",
    category: "view",
    defaultKeys: ["Ctrl", "\\"],
  },
  {
    id: "toggle_right_sidebar",
    name: "アウトライン表示切替",
    description: "右側のアウトライン（見出し一覧）サイドバーの表示・非表示を切り替えます",
    category: "view",
    defaultKeys: ["Ctrl", "Shift", "O"],
  },
  {
    id: "toggle_source_mode",
    name: "ソース直接編集モード切替",
    description: "WYSIWYGエディタとMarkdownソースコード直接編集モードを切り替えます",
    category: "view",
    defaultKeys: ["Ctrl", "/"],
  },
  {
    id: "toggle_focus_mode",
    name: "フォーカスモード切替",
    description: "カーソルがある行以外を暗くし執筆に集中するフォーカスモードを切り替えます",
    category: "view",
    defaultKeys: ["F8"],
  },
  {
    id: "open_cheatsheet",
    name: "チートシート表示",
    description: "Markdown記法とショートカットキーの早見表モーダルを表示します",
    category: "view",
    defaultKeys: ["F1"],
  },
  {
    id: "open_shortcuts_settings",
    name: "ショートカット設定表示",
    description: "ショートカットキーのカスタマイズ設定画面を表示します",
    category: "view",
    defaultKeys: ["Ctrl", ","],
  },

  // 書式・挿入
  {
    id: "insert_link",
    name: "リンクの挿入・編集",
    description: "リンク挿入ダイアログを開き、URLやタイトルを設定します",
    category: "format",
    defaultKeys: ["Ctrl", "K"],
  },
  {
    id: "toggle_blockquote",
    name: "引用の切り替え",
    description: "カーソル行または選択範囲を引用ブロックに変換します",
    category: "format",
    defaultKeys: ["Ctrl", "Shift", "Q"],
  },
  {
    id: "insert_table",
    name: "表（テーブル）の挿入",
    description: "3×3のMarkdownテーブルを挿入します",
    category: "format",
    defaultKeys: ["Ctrl", "Alt", "T"],
  },

  // 編集履歴
  {
    id: "undo",
    name: "元に戻す (Undo)",
    description: "直前の変更を取り消します",
    category: "edit",
    defaultKeys: ["Ctrl", "Z"],
  },
  {
    id: "redo",
    name: "やり直し (Redo)",
    description: "取り消した変更をやり直します",
    category: "edit",
    defaultKeys: ["Ctrl", "Y"],
  },
];

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  all: "すべて",
  file: "ファイル・タブ",
  view: "表示・モード",
  format: "書式・挿入",
  edit: "編集履歴",
};
