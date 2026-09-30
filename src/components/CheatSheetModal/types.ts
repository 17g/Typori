export interface ShortcutItem {
  id: string;
  name: string;
  keys: string[]; // 表示用のキー配列 (例: ["Ctrl", "S"])
  description: string;
  category: "file" | "edit" | "view" | "format";
}

export interface MarkdownSyntaxItem {
  id: string;
  name: string;
  syntax: string; // 記述例 (例: "**太字**")
  description: string;
  category: "basic" | "lists" | "blocks" | "advanced";
}

export type CheatSheetTab = "shortcuts" | "markdown";
