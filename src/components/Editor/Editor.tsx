import React, { useEffect, useRef } from "react";
import { defaultValueCtx, Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { history } from "@milkdown/kit/plugin/history";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";

export interface EditorProps {
  defaultValue?: string;
  content?: string;
  filePath?: string | null;
  onChange?: (markdown: string) => void;
}

export const defaultContent = `# ようこそ Typori へ

Typori は軽量でミニマルな Markdown エディタです。

## 特徴
- [x] シームレスな WYSIWYG 編集
- [x] GFM（GitHub Flavored Markdown）サポート
- [x] ローカルファイルシステムの高速な読み書き
- [ ] 美しいタイポグラフィとテーマ切り替え

## サンプルテーブル
| 機能 | 状態 | 備考 |
| :--- | :---: | :--- |
| CommonMark | 完了 | 標準 Markdown |
| GFM | 完了 | 表・タスク・~~打消し~~ |
| サイドバー | 完了 | ファイルツリー連携 |

自由に編集を始めてください。`;

const MilkdownEditorContent: React.FC<EditorProps> = ({
  defaultValue,
  content,
  onChange,
}) => {
  const initialValue = content ?? defaultValue ?? defaultContent;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const prevContentRef = useRef(content);

  useEditor(
    (root) => {
      return Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialValue);
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            prevContentRef.current = markdown;
            onChangeRef.current?.(markdown);
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener);
    },
    []
  );

  const [loading, getEditor] = useInstance();

  useEffect(() => {
    if (loading) return;
    const editor = getEditor();
    if (!editor) return;

    if (content !== undefined && content !== prevContentRef.current) {
      prevContentRef.current = content;
      editor.action(replaceAll(content));
    }
  }, [content, loading, getEditor]);

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
