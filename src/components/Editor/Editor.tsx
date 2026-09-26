import React from "react";
import { defaultValueCtx, Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";

interface EditorProps {
  defaultValue?: string;
}

const defaultContent = `# ようこそ Typori へ

Typori は軽量でミニマルな Markdown エディタです。

## 特徴
- [x] シームレスな WYSIWYG 編集
- [x] GFM（GitHub Flavored Markdown）サポート
- [ ] ローカルファイルシステムの高速な読み書き
- [ ] 美しいタイポグラフィとテーマ切り替え

## サンプルテーブル
| 機能 | 状態 | 備考 |
| :--- | :---: | :--- |
| CommonMark | 完了 | 標準 Markdown |
| GFM | 完了 | 表・タスク・~~打消し~~ |
| サイドバー | 予定 | ファイルツリー連携 |

自由に編集を始めてください。`;

const MilkdownEditorContent: React.FC<EditorProps> = ({
  defaultValue = defaultContent,
}) => {
  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
      })
      .use(commonmark)
      .use(gfm);
  }, [defaultValue]);

  return (
    <div className="typori-editor-container w-full h-full flex-1 overflow-y-auto px-8 py-6">
      <Milkdown />
    </div>
  );
};

export const TyporiEditor: React.FC<EditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <MilkdownEditorContent {...props} />
    </MilkdownProvider>
  );
};

export default TyporiEditor;
