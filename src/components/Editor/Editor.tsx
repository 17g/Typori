import { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from "react";
import { defaultValueCtx, Editor, editorViewCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark, linkSchema, blockquoteSchema } from "@milkdown/kit/preset/commonmark";
import { gfm, columnResizingPlugin, createTable } from "@milkdown/kit/preset/gfm";
import {
  isInTable,
  addRowBefore,
  addRowAfter,
  deleteRow,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  deleteTable,
} from "@milkdown/kit/prose/tables";
import "@milkdown/kit/prose/tables/style/tables.css";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { history, undoCommand, redoCommand } from "@milkdown/kit/plugin/history";
import { wrapIn, lift } from "@milkdown/kit/prose/commands";
import { callCommand, replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import LinkTooltip from "./LinkTooltip";
import EditorToolbar from "./EditorToolbar";
import TableFloatingToolbar from "./TableFloatingToolbar";

export interface EditorRef {
  undo: () => boolean;
  redo: () => boolean;
  focus: () => void;
  getMarkdown: () => string;
  toggleBlockquote: () => boolean;
  openLinkModal: () => void;
  insertLink: (href: string, title?: string) => boolean;
  removeLink: () => boolean;
  insertTable: (rows?: number, cols?: number) => boolean;
  addRowBefore: () => boolean;
  addRowAfter: () => boolean;
  deleteRow: () => boolean;
  addColumnBefore: () => boolean;
  addColumnAfter: () => boolean;
  deleteColumn: () => boolean;
  deleteTable: () => boolean;
  isInTable: () => boolean;
}

export interface EditorProps {
  defaultValue?: string;
  content?: string;
  filePath?: string | null;
  onChange?: (markdown: string) => void;
}

export const defaultContent = `# ようこそ Typori へ

Typori は軽量でミニマルな Markdown エディタです。

> **思考を邪魔しない、美しい執筆空間**
> Typori は Typora ライクな WYSIWYG 編集と高速なローカルファイル連携を提供します。

## 特徴
- [x] シームレスな WYSIWYG 編集
- [x] GFM（GitHub Flavored Markdown）サポート
- [x] リンクと引用の視覚的編集サポート（[Typori GitHub](https://github.com/)）
- [x] Undo / Redo の完全サポート (Ctrl+Z / Ctrl+Y)
- [ ] 美しいタイポグラフィとテーマ切り替え

## サンプルテーブル
| 機能 | 状態 | 備考 |
| :--- | :---: | :--- |
| CommonMark | 完了 | 標準 Markdown |
| GFM | 完了 | 表・タスク・~~打消し~~ |
| リンク・引用 | 完了 | 視覚的ツールバー & Ctrl+K / Ctrl+Shift+Q |
| サイドバー | 完了 | ファイルツリー連携 |

自由に編集を始めてください。`;

interface TooltipState {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  initialHref: string;
  initialText: string;
  isNewLink: boolean;
  linkRange: { from: number; to: number } | null;
}

const MilkdownEditorContent = forwardRef<EditorRef, EditorProps>(
  ({ defaultValue, content, onChange }, ref) => {
    const initialValue = content ?? defaultValue ?? defaultContent;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const prevContentRef = useRef(content ?? initialValue);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tooltipState, setTooltipState] = useState<TooltipState>({
      isOpen: false,
      position: null,
      initialHref: "",
      initialText: "",
      isNewLink: false,
      linkRange: null,
    });

    const [tableToolbarState, setTableToolbarState] = useState<{
      isOpen: boolean;
      position: { top: number; left: number } | null;
    }>({
      isOpen: false,
      position: null,
    });

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
            ctx.get(listenerCtx).selectionUpdated((ctx) => {
              try {
                const view = ctx.get(editorViewCtx);
                const inTable = isInTable(view.state);
                if (inTable) {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  if (containerRect && coords) {
                    const scrollOffset = containerRef.current?.scrollTop || 0;
                    const top = Math.max(8, coords.top - containerRect.top + scrollOffset - 44);
                    const left = Math.max(
                      16,
                      Math.min(coords.left - containerRect.left, containerRect.width - 340)
                    );
                    setTableToolbarState({
                      isOpen: true,
                      position: { top, left },
                    });
                  }
                } else {
                  setTableToolbarState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
                }
              } catch {
                // ignore
              }
            });
          })
          .use(commonmark)
          .use(gfm)
          .use(columnResizingPlugin)
          .use(history)
          .use(listener);
      },
      []
    );

    const [loading, getEditor] = useInstance();

    // 外部リンクをブラウザで開く
    const openExternalUrl = useCallback(async (url: string) => {
      try {
        await openUrl(url);
      } catch (err) {
        console.warn("Failed to open URL via plugin-opener, falling back to window.open:", err);
        window.open(url, "_blank");
      }
    }, []);

    // 引用（Blockquote）のトグル
    const toggleBlockquote = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;

      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state, dispatch } = view;
        const blockquoteType = blockquoteSchema.type(ctx);

        // 既にblockquoteの中にいるか判定
        let inBlockquote = false;
        for (let d = state.selection.$from.depth; d > 0; d--) {
          if (state.selection.$from.node(d).type === blockquoteType) {
            inBlockquote = true;
            break;
          }
        }

        let result = false;
        if (inBlockquote) {
          result = lift(state, dispatch);
        } else {
          result = wrapIn(blockquoteType)(state, dispatch);
        }
        view.focus();
        return result;
      });
    }, [loading, getEditor]);

    // リンク編集ポップオーバーを開く
    const openLinkModal = useCallback(() => {
      if (loading) return;
      const editor = getEditor();
      if (!editor) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { selection, doc } = state;
        const markType = linkSchema.type(ctx);

        let href = "";
        let text = "";
        let isNew = false;
        let range: { from: number; to: number } | null = null;

        if (selection.empty) {
          // カーソル位置のMarkをチェック
          const mark = selection.$from.marks().find((m) => m.type === markType);
          if (mark) {
            href = (mark.attrs.href as string) || "";
            const start = selection.$from.pos - selection.$from.textOffset;
            const end = start + selection.$from.parent.child(selection.$from.index()).nodeSize;
            range = { from: start, to: end };
            text = doc.textBetween(start, end);
            isNew = false;
          } else {
            // リンク外でのカーソル
            isNew = true;
            range = { from: selection.from, to: selection.to };
          }
        } else {
          // 範囲選択
          let foundMark = null;
          doc.nodesBetween(selection.from, selection.to, (node) => {
            const m = node.marks.find((mark) => mark.type === markType);
            if (m) foundMark = m;
          });

          if (foundMark) {
            // @ts-expect-error attrs exists on Mark
            href = (foundMark.attrs.href as string) || "";
            isNew = false;
          } else {
            isNew = true;
          }
          text = doc.textBetween(selection.from, selection.to);
          range = { from: selection.from, to: selection.to };
        }

        // ツールチップ表示位置の計算
        const containerRect = containerRef.current?.getBoundingClientRect();
        const targetPos = range ? range.from : selection.from;
        let top = 60;
        let left = 20;

        try {
          const coords = view.coordsAtPos(targetPos);
          if (containerRect && coords) {
            const scrollOffset = containerRef.current?.scrollTop || 0;
            top = coords.bottom - containerRect.top + scrollOffset + 8;
            left = Math.max(16, Math.min(coords.left - containerRect.left, containerRect.width - 340));
          }
        } catch (err) {
          console.warn("Failed to get coordsAtPos:", err);
        }

        setTooltipState({
          isOpen: true,
          position: { top, left },
          initialHref: href,
          initialText: text,
          isNewLink: isNew,
          linkRange: range,
        });
      });
    }, [loading, getEditor]);

    // リンクの適用
    const applyLink = useCallback(
      (href: string, text?: string) => {
        if (loading) return false;
        const editor = getEditor();
        if (!editor) return false;

        const success = editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const markType = linkSchema.type(ctx);
          const range = tooltipState.linkRange ?? { from: state.selection.from, to: state.selection.to };

          let tr = state.tr;
          if (range.from === range.to) {
            // 空の選択範囲：テキストとリンクMarkを挿入
            const linkText = text || href;
            const textNode = state.schema.text(linkText, [markType.create({ href })]);
            tr = tr.insert(range.from, textNode);
          } else {
            // 範囲選択：リンクMarkを付与・更新
            tr = tr.removeMark(range.from, range.to, markType);
            if (text && text !== state.doc.textBetween(range.from, range.to)) {
              tr = tr.replaceWith(range.from, range.to, state.schema.text(text, [markType.create({ href })]));
            } else {
              tr = tr.addMark(range.from, range.to, markType.create({ href }));
            }
          }
          dispatch(tr);
          view.focus();
          return true;
        });

        setTooltipState((prev) => ({ ...prev, isOpen: false }));
        return success;
      },
      [loading, getEditor, tooltipState.linkRange]
    );

    // リンクの解除
    const removeLink = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;

      const success = editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state, dispatch } = view;
        const markType = linkSchema.type(ctx);
        const range = tooltipState.linkRange ?? { from: state.selection.from, to: state.selection.to };

        const tr = state.tr.removeMark(range.from, range.to, markType);
        dispatch(tr);
        view.focus();
        return true;
      });

      setTooltipState((prev) => ({ ...prev, isOpen: false }));
      return success;
    }, [loading, getEditor, tooltipState.linkRange]);

    // 表（テーブル）の挿入
    const insertTable = useCallback(
      (rows = 3, cols = 3) => {
        if (loading) return false;
        const editor = getEditor();
        if (!editor) return false;

        return editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const tableNode = createTable(ctx, rows, cols);
          const tr = state.tr.replaceSelectionWith(tableNode).scrollIntoView();
          dispatch(tr);
          view.focus();
          return true;
        });
      },
      [loading, getEditor]
    );

    // 行を上に追加
    const addRowBeforeAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addRowBefore(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 行を下に追加
    const addRowAfterAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addRowAfter(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 行を削除
    const deleteRowAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = deleteRow(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 列を左に追加
    const addColBeforeAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addColumnBefore(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 列を右に追加
    const addColAfterAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addColumnAfter(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 列を削除
    const deleteColAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = deleteColumn(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor]);

    // 表を削除
    const deleteTableAction = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      const res = editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const r = deleteTable(view.state, view.dispatch);
        view.focus();
        return r;
      });
      setTableToolbarState((prev) => ({ ...prev, isOpen: false }));
      return res;
    }, [loading, getEditor]);

    // 表内か判定
    const checkIsInTable = useCallback(() => {
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        return isInTable(view.state);
      });
    }, [loading, getEditor]);

    // クリック処理（Ctrl+Clickで外部リンク、通常クリックでツールチップ）
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && anchor.hasAttribute("href")) {
        const href = anchor.getAttribute("href");
        if (!href) return;

        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          openExternalUrl(href);
          return;
        }

        // 通常クリック時: ツールチップを開く
        setTimeout(() => {
          openLinkModal();
        }, 30);
        return;
      }

      // リンク以外の場所をクリックしたとき、ツールチップを閉じる
      if (tooltipState.isOpen) {
        setTooltipState((prev) => ({ ...prev, isOpen: false }));
      }
    };

    // ショートカットキーハンドラー
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Ctrl+K / Cmd+K: リンク挿入・編集
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openLinkModal();
        return;
      }

      // Ctrl+Shift+Q / Cmd+Shift+Q: 引用トグル
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "q" || e.key === "Q")) {
        e.preventDefault();
        toggleBlockquote();
        return;
      }

      // Ctrl+Alt+T / Cmd+Alt+T: 表（テーブル）挿入
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        insertTable(3, 3);
        return;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        undo: () => {
          if (loading) return false;
          const editor = getEditor();
          if (!editor) return false;
          try {
            return Boolean(editor.action(callCommand(undoCommand.key)));
          } catch (err) {
            console.warn("Failed to execute undo command:", err);
            return false;
          }
        },
        redo: () => {
          if (loading) return false;
          const editor = getEditor();
          if (!editor) return false;
          try {
            return Boolean(editor.action(callCommand(redoCommand.key)));
          } catch (err) {
            console.warn("Failed to execute redo command:", err);
            return false;
          }
        },
        focus: () => {
          if (loading) return;
          const editor = getEditor();
          if (!editor) return;
          try {
            editor.action((ctx) => {
              const view = ctx.get(editorViewCtx);
              view.focus();
            });
          } catch (err) {
            console.warn("Failed to focus editor:", err);
          }
        },
        getMarkdown: () => {
          return prevContentRef.current ?? "";
        },
        toggleBlockquote,
        openLinkModal,
        insertLink: (href: string, title?: string) => applyLink(href, title),
        removeLink,
        insertTable,
        addRowBefore: addRowBeforeAction,
        addRowAfter: addRowAfterAction,
        deleteRow: deleteRowAction,
        addColumnBefore: addColBeforeAction,
        addColumnAfter: addColAfterAction,
        deleteColumn: deleteColAction,
        deleteTable: deleteTableAction,
        isInTable: checkIsInTable,
      }),
      [
        loading,
        getEditor,
        toggleBlockquote,
        openLinkModal,
        applyLink,
        removeLink,
        insertTable,
        addRowBeforeAction,
        addRowAfterAction,
        deleteRowAction,
        addColBeforeAction,
        addColAfterAction,
        deleteColAction,
        deleteTableAction,
        checkIsInTable,
      ]
    );

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
      <div
        ref={containerRef}
        className="typori-editor-wrapper relative w-full h-full flex-1 overflow-y-auto px-8 py-6"
        onClick={handleContainerClick}
        onKeyDown={handleKeyDown}
      >
        <EditorToolbar
          onInsertLink={openLinkModal}
          onToggleBlockquote={toggleBlockquote}
          onInsertTable={() => insertTable(3, 3)}
          onUndo={() => {
            if (!loading && getEditor()) {
              getEditor()?.action(callCommand(undoCommand.key));
            }
          }}
          onRedo={() => {
            if (!loading && getEditor()) {
              getEditor()?.action(callCommand(redoCommand.key));
            }
          }}
        />

        <div className="typori-editor-container w-full min-h-full">
          <Milkdown />
        </div>

        <LinkTooltip
          isOpen={tooltipState.isOpen}
          position={tooltipState.position}
          initialHref={tooltipState.initialHref}
          initialText={tooltipState.initialText}
          isNewLink={tooltipState.isNewLink}
          onApply={applyLink}
          onRemove={removeLink}
          onOpenUrl={openExternalUrl}
          onClose={() => setTooltipState((prev) => ({ ...prev, isOpen: false }))}
        />

        <TableFloatingToolbar
          isOpen={tableToolbarState.isOpen}
          position={tableToolbarState.position}
          onAddRowBefore={addRowBeforeAction}
          onAddRowAfter={addRowAfterAction}
          onDeleteRow={deleteRowAction}
          onAddColBefore={addColBeforeAction}
          onAddColAfter={addColAfterAction}
          onDeleteCol={deleteColAction}
          onDeleteTable={deleteTableAction}
        />
      </div>
    );
  }
);

MilkdownEditorContent.displayName = "MilkdownEditorContent";

export const TyporiEditor = forwardRef<EditorRef, EditorProps>((props, ref) => {
  return (
    <MilkdownProvider>
      <MilkdownEditorContent {...props} ref={ref} />
    </MilkdownProvider>
  );
});

TyporiEditor.displayName = "TyporiEditor";

export default TyporiEditor;
