import { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from "react";
import { defaultValueCtx, Editor, editorViewCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark, linkSchema, blockquoteSchema, imageSchema } from "@milkdown/kit/preset/commonmark";
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
import { trailing } from "@milkdown/kit/plugin/trailing";
import { wrapIn, lift } from "@milkdown/kit/prose/commands";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose, callCommand, replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { saveImageBinary, readFileBinary, resolveImagePath, isImageFilePath } from "../../api/fs";
import LinkTooltip from "./LinkTooltip";
import EditorToolbar from "./EditorToolbar";
import TableFloatingToolbar from "./TableFloatingToolbar";

export const focusModePluginKey = new PluginKey("focusModePlugin");

export const focusModePlugin = $prose(() => {
  return new Plugin({
    key: focusModePluginKey,
    props: {
      decorations(state) {
        const { doc, selection } = state;
        const { $from } = selection;
        if ($from.depth >= 1) {
          const decs: Decoration[] = [];
          for (let d = 1; d <= $from.depth; d++) {
            const node = $from.node(d);
            if (node.isBlock) {
              const start = $from.before(d);
              decs.push(
                Decoration.node(start, start + node.nodeSize, {
                  class: "focus-mode-active",
                })
              );
            }
          }
          if (decs.length > 0) {
            return DecorationSet.create(doc, decs);
          }
        }
        return DecorationSet.empty;
      },
    },
  });
});

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
  insertImage: (src: string, alt?: string, title?: string) => boolean;
}

export interface EditorProps {
  defaultValue?: string;
  content?: string;
  filePath?: string | null;
  workspaceDir?: string | null;
  onChange?: (markdown: string) => void;
  onToggleSourceMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
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

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

const MilkdownEditorContent = forwardRef<EditorRef, EditorProps>(
  (
    {
      defaultValue,
      content,
      filePath,
      workspaceDir,
      onChange,
      onToggleSourceMode,
      isFocusMode = false,
      onToggleFocusMode,
    },
    ref
  ) => {
    const initialValue = content ?? defaultValue ?? defaultContent;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const prevContentRef = useRef(content ?? initialValue);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resolvedImageUrlsRef = useRef<Map<string, string>>(new Map());

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dragCounterRef = useRef(0);

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

    // DOM内のローカル画像パスを読み込みBlob URLとして解決・表示する
    const resolveImagesInDOM = useCallback(async () => {
      if (!containerRef.current) return;
      const imgElements = containerRef.current.querySelectorAll<HTMLImageElement>("img");
      for (const img of Array.from(imgElements)) {
        const rawSrc = img.getAttribute("data-raw-src") || img.getAttribute("src");
        if (!rawSrc) continue;

        if (
          rawSrc.startsWith("http://") ||
          rawSrc.startsWith("https://") ||
          rawSrc.startsWith("data:") ||
          rawSrc.startsWith("blob:") ||
          rawSrc.startsWith("asset://")
        ) {
          continue;
        }

        if (!img.hasAttribute("data-raw-src")) {
          img.setAttribute("data-raw-src", rawSrc);
        }

        if (resolvedImageUrlsRef.current.has(rawSrc)) {
          const cached = resolvedImageUrlsRef.current.get(rawSrc)!;
          if (img.src !== cached) {
            img.src = cached;
          }
          continue;
        }

        try {
          const absPath = await resolveImagePath(rawSrc, filePath, workspaceDir);
          const binaryData = await readFileBinary(absPath);
          const mime = getMimeType(absPath);
          const blob = new Blob([new Uint8Array(binaryData)], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          resolvedImageUrlsRef.current.set(rawSrc, blobUrl);
          img.src = blobUrl;
        } catch (err) {
          console.warn(`Failed to resolve local image '${rawSrc}':`, err);
        }
      }
    }, [filePath, workspaceDir]);

    // DOMの変更を監視して画像を自動解決
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      resolveImagesInDOM();

      const observer = new MutationObserver(() => {
        resolveImagesInDOM();
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"],
      });

      return () => {
        observer.disconnect();
      };
    }, [resolveImagesInDOM]);

    // アンマウント時にBlob URLを解放
    useEffect(() => {
      const urlsMap = resolvedImageUrlsRef.current;
      return () => {
        for (const url of urlsMap.values()) {
          URL.revokeObjectURL(url);
        }
        urlsMap.clear();
      };
    }, []);

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
          .use(trailing)
          .use(focusModePlugin)
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

    // 画像の挿入
    const insertImage = useCallback(
      (src: string, alt = "", title = "") => {
        if (loading) return false;
        const editor = getEditor();
        if (!editor) return false;

        const res = editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const imageType = imageSchema.type(ctx);
          const imageNode = imageType.createAndFill({
            src,
            alt: alt || "image",
            title: title || alt || "",
          });
          if (!imageNode) return false;
          const tr = state.tr.replaceSelectionWith(imageNode).scrollIntoView();
          dispatch(tr);
          view.focus();
          return true;
        });

        setTimeout(resolveImagesInDOM, 50);
        return res;
      },
      [loading, getEditor, resolveImagesInDOM]
    );

    // ドラッグ＆ドロップハンドラー
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/") || isImageFilePath(f.name));

      if (imageFiles.length === 0) return;

      for (const file of imageFiles) {
        try {
          const buffer = await file.arrayBuffer();
          const bytes = Array.from(new Uint8Array(buffer));
          const saved = await saveImageBinary(file.name, bytes, filePath, workspaceDir);
          insertImage(saved.relative_path, saved.file_name);
        } catch (err) {
          console.error(`Failed to save image '${file.name}':`, err);
          alert(`画像の保存に失敗しました: ${err}`);
        }
      }
    };

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

      // F8: フォーカスモード切替
      if (e.key === "F8") {
        e.preventDefault();
        onToggleFocusMode?.();
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
        insertImage,
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
        insertImage,
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
        className={`typori-editor-wrapper relative w-full h-full flex-1 overflow-y-auto px-8 py-6 transition-colors ${
          isFocusMode ? "focus-mode" : ""
        } ${
          isDraggingOver ? "bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/50 inset-ring" : ""
        }`}
        onClick={handleContainerClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
              try {
                const buffer = await file.arrayBuffer();
                const bytes = Array.from(new Uint8Array(buffer));
                const saved = await saveImageBinary(file.name, bytes, filePath, workspaceDir);
                insertImage(saved.relative_path, saved.file_name);
              } catch (err) {
                console.error("Failed to insert image:", err);
                alert(`画像の挿入に失敗しました: ${err}`);
              }
            }
            e.target.value = "";
          }}
        />

        {isDraggingOver && (
          <div className="absolute inset-4 z-30 pointer-events-none flex flex-col items-center justify-center bg-indigo-50/80 dark:bg-zinc-900/85 border-2 border-dashed border-indigo-500 rounded-xl backdrop-blur-xs transition-all shadow-xl">
            <div className="flex flex-col items-center gap-2.5 p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400">
              <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-semibold text-sm">画像をドロップして挿入</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">assets フォルダに自動保存されます</span>
            </div>
          </div>
        )}

        <EditorToolbar
          onInsertLink={openLinkModal}
          onToggleBlockquote={toggleBlockquote}
          onInsertTable={() => insertTable(3, 3)}
          onInsertImage={() => fileInputRef.current?.click()}
          onToggleSourceMode={onToggleSourceMode}
          isFocusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
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
