import React from "react";
import { defaultValueCtx, Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";

interface EditorProps {
  defaultValue?: string;
}

const MilkdownEditorContent: React.FC<EditorProps> = ({
  defaultValue = "# ようこそ Typori へ\n\nTypori は軽量でミニマルな Markdown エディタです。\n\n- シームレスな WYSIWYG 編集\n- ローカルファイルシステムの高速な読み書き\n- 美しいタイポグラフィ\n\n自由に編集を始めてください。",
}) => {
  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
      })
      .use(commonmark);
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
