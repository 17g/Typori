import { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from "react";
import { defaultValueCtx, Editor, editorViewCtx, remarkStringifyOptionsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
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
import { Decoration, DecorationSet, EditorView } from "@milkdown/kit/prose/view";
import { $prose, callCommand, replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { saveImageBinary, readFileBinary, resolveImagePath, isImageFilePath } from "../../api/fs";
import { normalizeLineEndings, isLargeContent } from "../../utils/text";
import { isSafeExternalUrl } from "../../utils/url";
import LinkTooltip from "./LinkTooltip";
import EditorToolbar from "./EditorToolbar";
import TableFloatingToolbar from "./TableFloatingToolbar";
import { mermaidPlugin, rerenderAllMermaidDiagrams } from "./mermaidPlugin";

export { isSafeExternalUrl, isLargeContent };

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

export interface TargetBlockInfo {
  index: number;
  pos: number;
  size: number;
  type: string;
}

/**
 * ProseMirrorドキュメントから「テキストを持つ最小単位のブロック」を走査・特定する
 * 段落、見出し、リスト項目内段落、引用内段落、コードブロック、表、水平線、画像（ブロック画像）をそれぞれ1ブロックとして連番を付与する。
 * コンテナブロック（doc, blockquote, bullet_list, ordered_list, list_item）自体はスキップし、表・コードブロックは内部構造によらず1ブロックとする。
 */
export function getTargetBlocks(doc: any): TargetBlockInfo[] {
  const blocks: TargetBlockInfo[] = [];
  if (!doc) return blocks;

  doc.descendants((node: any, pos: number) => {
    if (!node.isBlock) {
      return false;
    }

    const typeName = node.type?.name ?? "";

    // 表 (table): 内部の行・セルにかかわらず表全体で1ブロック
    if (typeName === "table") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // コードブロック (code_block / fence): 内部行数にかかわらず1ブロック
    if (typeName === "code_block" || typeName === "fence") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // 水平線 (hr)
    if (typeName === "hr") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // ブロック画像 (image)
    if (typeName === "image") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // 見出し (heading)
    if (typeName === "heading") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // 段落 (paragraph): 通常段落、リスト項目内の段落、引用内の段落
    if (typeName === "paragraph") {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // その他のテキストブロック
    if (node.isTextblock) {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }

    // コンテナノード（doc, blockquote, bullet_list, ordered_list, list_item 等）は子ノードへ潜る
    return true;
  });

  return blocks;
}

/**
 * 選択範囲のヘッド（キャレット位置）が含まれるブロックのインデックス（0-based）を取得する
 */
export function getActiveBlockIndex(blocks: TargetBlockInfo[], targetPos: number): number {
  if (blocks.length === 0) return -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLast = i === blocks.length - 1;
    const end = block.pos + block.size;
    if (isLast) {
      if (targetPos >= block.pos && targetPos <= end) {
        return i;
      }
    } else {
      if (targetPos >= block.pos && targetPos < end) {
        return i;
      }
    }
  }

  if (targetPos >= blocks[blocks.length - 1].pos) {
    return blocks.length - 1;
  }
  return 0;
}

/**
 * 与えられた pos に対して、その位置を含むか最も近い直前のブロックインデックスを二分探索で高速に特定する (O(log N))
 */
export function findBlockIndexByPos(blocks: TargetBlockInfo[], pos: number): number {
  if (blocks.length === 0) return -1;
  if (pos <= blocks[0].pos) return 0;
  if (pos >= blocks[blocks.length - 1].pos) return blocks.length - 1;

  let low = 0;
  let high = blocks.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = blocks[mid];
    const end = block.pos + block.size;

    if (pos >= block.pos && pos < end) {
      return mid;
    }

    if (block.pos <= pos) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export interface VisibleBlockRange {
  startIndex: number;
  endIndex: number;
  isVirtualized: boolean;
}

/**
 * ビューポート内の可視ブロックインデックス範囲を特定する
 * 60ブロック以下の小規模ドキュメントは全件描画、大容量ドキュメントは大半の Forced Reflow を排除し仮想化描画する
 */
export function getVisibleBlockRange(
  blocks: TargetBlockInfo[],
  view: any,
  bufferPx = 300
): VisibleBlockRange {
  const total = blocks.length;
  if (total === 0) {
    return { startIndex: 0, endIndex: -1, isVirtualized: false };
  }

  // 60ブロック以下の小規模ドキュメントは全件描画で十分高速
  const VIRTUALIZATION_THRESHOLD = 60;
  if (total <= VIRTUALIZATION_THRESHOLD) {
    return { startIndex: 0, endIndex: total - 1, isVirtualized: false };
  }

  try {
    const scrollContainer =
      view.dom.closest?.(".typori-editor-wrapper") ||
      view.dom.parentElement?.parentElement ||
      view.dom.parentElement;

    const containerRect = scrollContainer?.getBoundingClientRect?.() ?? view.dom.getBoundingClientRect();
    const viewRect = view.dom.getBoundingClientRect();

    // スクロールコンテナとエディタの交差領域を算出
    const visibleTop = Math.max(containerRect.top, viewRect.top);
    const visibleBottom = Math.min(containerRect.bottom, viewRect.bottom);

    // 上下バッファを追加
    const searchTop = visibleTop - bufferPx;
    const searchBottom = visibleBottom + bufferPx;

    const centerX = viewRect.left + Math.min(100, Math.max(20, viewRect.width / 4));

    // ビューポート上端と下端の ProseMirror 位置を取得
    const topResult = view.posAtCoords?.({
      left: centerX,
      top: Math.max(viewRect.top + 2, searchTop),
    });

    const bottomResult = view.posAtCoords?.({
      left: centerX,
      top: Math.min(viewRect.bottom - 2, searchBottom),
    });

    let startIndex = 0;
    let endIndex = total - 1;

    if (topResult?.pos != null) {
      const foundStart = findBlockIndexByPos(blocks, topResult.pos);
      // 上方向に5ブロックの余裕を持たせる
      startIndex = Math.max(0, foundStart - 5);
    }

    if (bottomResult?.pos != null) {
      const foundEnd = findBlockIndexByPos(blocks, bottomResult.pos);
      // 下方向に8ブロックの余裕を持たせる
      endIndex = Math.min(total - 1, foundEnd + 8);
    }

    // 逆転ガード
    if (startIndex > endIndex) {
      startIndex = Math.max(0, endIndex - 10);
    }

    return {
      startIndex,
      endIndex,
      isVirtualized: true,
    };
  } catch {
    // 例外発生時は全件フォールバック
    return { startIndex: 0, endIndex: total - 1, isVirtualized: false };
  }
}

let globalShowLineNumbers = true;
export function setGlobalShowLineNumbers(enabled: boolean) {
  globalShowLineNumbers = enabled;
}
export function getGlobalShowLineNumbers(): boolean {
  return globalShowLineNumbers;
}

export const lineNumbersPluginKey = new PluginKey("lineNumbersPlugin");

export const lineNumbersPlugin = $prose(() => {
  return new Plugin({
    key: lineNumbersPluginKey,
    state: {
      init(_, state) {
        const blocks = getTargetBlocks(state.doc);
        const head = (state.selection as any).head ?? state.selection.from;
        const activeIndex = getActiveBlockIndex(blocks, head);
        return {
          blocks,
          activeIndex,
          enabled: getGlobalShowLineNumbers(),
        };
      },
      apply(tr, prev, _oldState, newState) {
        const meta = tr.getMeta(lineNumbersPluginKey);
        const enabled =
          meta?.showLineNumbers !== undefined ? Boolean(meta.showLineNumbers) : getGlobalShowLineNumbers();

        if (!tr.docChanged && !tr.selectionSet && meta === undefined && prev.enabled === enabled) {
          return prev;
        }

        const blocks = tr.docChanged ? getTargetBlocks(newState.doc) : prev.blocks;
        const head = (newState.selection as any).head ?? newState.selection.from;
        const activeIndex = getActiveBlockIndex(blocks, head);

        return {
          blocks,
          activeIndex,
          enabled,
        };
      },
    },
    view(editorView) {
      let gutterEl: HTMLDivElement | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let scrollContainer: HTMLElement | null = null;
      let rafId: number | null = null;
      let isDestroyed = false;

      const ensureGutter = () => {
        if (gutterEl && gutterEl.isConnected) return gutterEl;
        const milkdownEl = editorView.dom.parentElement;
        if (!milkdownEl) return null;

        milkdownEl.style.position = "relative";
        gutterEl = document.createElement("div");
        gutterEl.className = "typori-prosemirror-gutter";
        gutterEl.setAttribute("aria-hidden", "true");
        milkdownEl.insertBefore(gutterEl, editorView.dom);
        return gutterEl;
      };

      const renderGutter = (view: any) => {
        if (isDestroyed) return;
        const pluginState = lineNumbersPluginKey.getState(view.state);
        const enabled = pluginState ? pluginState.enabled : getGlobalShowLineNumbers();

        const gutter = ensureGutter();
        if (!gutter) return;

        if (!enabled) {
          gutter.style.display = "none";
          gutter.innerHTML = "";
          view.dom.classList.remove("has-line-numbers");
          return;
        }

        gutter.style.display = "block";
        view.dom.classList.add("has-line-numbers");

        const blocks = pluginState?.blocks ?? getTargetBlocks(view.state.doc);
        const activeIndex = pluginState?.activeIndex ?? 0;

        if (blocks.length === 0) {
          gutter.innerHTML = "";
          return;
        }

        const milkdownEl = view.dom.parentElement;
        const parentRect = milkdownEl ? milkdownEl.getBoundingClientRect() : view.dom.getBoundingClientRect();

        // ビューポート可視ブロック範囲のみを計算（仮想化）
        const range = getVisibleBlockRange(blocks, view, 300);
        const fragment = document.createDocumentFragment();

        for (let i = range.startIndex; i <= range.endIndex; i++) {
          const block = blocks[i];
          const item = document.createElement("div");
          item.className = "typori-line-number-item";
          item.setAttribute("data-line-number", String(block.index));
          if (i === activeIndex) {
            item.classList.add("typori-line-number-active");
          }
          item.textContent = String(block.index);

          try {
            const coords = view.coordsAtPos(block.pos);
            const top = coords.top - parentRect.top;
            item.style.top = `${Math.max(0, top)}px`;
          } catch {
            // fallback if coordsAtPos fails
          }

          fragment.appendChild(item);
        }

        gutter.innerHTML = "";
        gutter.appendChild(fragment);
      };

      const scheduleUpdate = (view: any) => {
        if (isDestroyed) return;
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (isDestroyed) return;
          renderGutter(view);
        });
      };

      const handleScroll = () => {
        scheduleUpdate(editorView);
      };

      const setupScrollListener = () => {
        if (scrollContainer && scrollContainer.isConnected) return;
        const found =
          editorView.dom.closest?.(".typori-editor-wrapper") ||
          editorView.dom.parentElement?.parentElement ||
          editorView.dom.parentElement;

        if (found && found !== scrollContainer) {
          if (scrollContainer) {
            scrollContainer.removeEventListener("scroll", handleScroll);
          }
          scrollContainer = found as HTMLElement;
          scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
        }
      };

      const timer = setTimeout(() => {
        setupScrollListener();
        renderGutter(editorView);
      }, 0);

      const handleResize = () => {
        scheduleUpdate(editorView);
      };
      window.addEventListener("resize", handleResize);

      if (typeof ResizeObserver !== "undefined" && editorView.dom.parentElement) {
        resizeObserver = new ResizeObserver(() => {
          scheduleUpdate(editorView);
        });
        resizeObserver.observe(editorView.dom);
      }

      return {
        update(view) {
          setupScrollListener();
          scheduleUpdate(view);
        },
        destroy() {
          isDestroyed = true;
          clearTimeout(timer);
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          window.removeEventListener("resize", handleResize);
          if (scrollContainer) {
            scrollContainer.removeEventListener("scroll", handleScroll);
            scrollContainer = null;
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }
          if (gutterEl) {
            gutterEl.remove();
            gutterEl = null;
          }
          editorView.dom.classList.remove("has-line-numbers");
        },
      };
    },
  });
});

/**
 * ProseMirror の EditorView において選択テキストのインライン書式（Mark）を一括解除するコマンド/関数
 * 
 * 選択範囲（Selection）が存在する場合に tr.removeMark(from, to) を実行し、
 * すべてのインラインMark（太字、斜体、打消し線、インラインコード、リンク等）を一括解除します。
 * 選択範囲が空（カーソルのみ）の場合は何もしません（空選択ガード）。
 * 
 * @param view ProseMirror EditorView
 * @returns 書式クリアが実行された場合は true、空選択や失敗時は false
 */
export function clearWysiwygFormatting(view: EditorView | any): boolean {
  if (!view || !view.state) return false;
  const { state, dispatch } = view;
  const { selection } = state;

  if (selection.empty || selection.from === selection.to) {
    // 空選択ガード: 選択範囲がない場合は何もしない
    return false;
  }

  const tr = state.tr.removeMark(selection.from, selection.to);
  tr.setStoredMarks([]);
  dispatch(tr);
  view.focus();
  return true;
}

export const clearWysiwygFormattingCommand = clearWysiwygFormatting;

export interface EditorRef {
  undo: () => boolean;
  redo: () => boolean;
  focus: () => void;
  clearFormatting: () => boolean;
  getMarkdown: () => string;
  hasUserInteracted: () => boolean;
  markUserInteracted: () => void;
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
  getScrollTop: () => number;
  setScrollTop: (top: number) => void;
}

export interface EditorProps {
  defaultValue?: string;
  content?: string;
  isDirty?: boolean;
  filePath?: string | null;
  workspaceDir?: string | null;
  onChange?: (markdown: string, meta?: { isUserInteraction?: boolean }) => void;
  onToggleSourceMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  showLineNumbers?: boolean;
  isRightSidebarOpen?: boolean;
  theme?: "light" | "dark";
  initialScrollTop?: number;
  onClearFormatting?: () => void;
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
      isDirty = false,
      filePath,
      workspaceDir,
      onChange,
      onToggleSourceMode,
      isFocusMode = false,
      onToggleFocusMode,
      showLineNumbers = true,
      isRightSidebarOpen = false,
      theme,
      initialScrollTop,
      onClearFormatting,
    },
    ref
  ) => {
    // テーマ切り替え検知による Mermaid ダイアグラムの動的再レンダリング
    useEffect(() => {
      if (theme) {
        rerenderAllMermaidDiagrams(theme);
      }
    }, [theme]);

    const initialValue = normalizeLineEndings(content ?? defaultValue ?? defaultContent);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // ユーザーによる能動的な編集操作（キーストローク・コマンド・入力）が行われたかを追跡
    // ファイルロード直後やマウント直後の初回シリアライズ差異による未保存（Dirty）誤爆を抑止する
    // 未保存変更が存在するタブ（isDirty: true）の場合は初期状態から操作済みとして追跡
    const hasUserInteractedRef = useRef(false);
    useEffect(() => {
      if (isDirty) {
        hasUserInteractedRef.current = true;
      }
    }, [isDirty]);

    const markUserInteracted = useCallback(() => {
      hasUserInteractedRef.current = true;
    }, []);

    const prevContentRef = useRef(initialValue);
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

    // スクロール量に応じたパレット自動非表示（オートハイド）およびホバー再表示の状態管理
    const SCROLL_TOP_THRESHOLD = 20;
    const [isScrolled, setIsScrolled] = useState(false);
    const [isToolbarHovered, setIsToolbarHovered] = useState(false);
    const resolvingImagesRef = useRef<Set<string>>(new Set());
    const resolveImagesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // DOM内のローカル画像パスを読み込みBlob URLとして解決・表示する
    // ビューポート優先 & 遅延評価: 可視領域近傍の画像を優先解決し、初期オープン時の負荷を大幅軽減
    const resolveImagesInDOM = useCallback(
      async (options?: { onlyVisible?: boolean }) => {
        const container = containerRef.current;
        if (!container) return;

        const imgElements = container.querySelectorAll<HTMLImageElement>("img");
        if (imgElements.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const BUFFER_PX = 400;
        const searchTop = containerRect.top - BUFFER_PX;
        const searchBottom = containerRect.bottom + BUFFER_PX;

        const pendingImages: { img: HTMLImageElement; rawSrc: string }[] = [];

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

          if (resolvingImagesRef.current.has(rawSrc)) {
            continue;
          }

          // 可視領域内外を判定
          let isNearViewport = true;
          try {
            const imgRect = img.getBoundingClientRect();
            isNearViewport = imgRect.bottom >= searchTop && imgRect.top <= searchBottom;
          } catch {
            isNearViewport = true;
          }

          if (options?.onlyVisible && !isNearViewport) {
            continue;
          }

          pendingImages.push({ img, rawSrc });
        }

        // 画像の非同期ロード
        for (const { img, rawSrc } of pendingImages) {
          resolvingImagesRef.current.add(rawSrc);
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
          } finally {
            resolvingImagesRef.current.delete(rawSrc);
          }
        }
      },
      [filePath, workspaceDir]
    );

    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setIsScrolled(scrollTop > SCROLL_TOP_THRESHOLD);

        if (resolveImagesTimerRef.current) {
          clearTimeout(resolveImagesTimerRef.current);
        }
        resolveImagesTimerRef.current = setTimeout(() => {
          resolveImagesInDOM({ onlyVisible: true });
        }, 150);
      },
      [resolveImagesInDOM]
    );

    // DOMの変更を監視して画像を自動解決（デバウンス & 段階評価）
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // 初期マウント時はまず可視領域近傍を優先解決
      resolveImagesInDOM({ onlyVisible: true });

      // アイドル時（または少し遅延して）全画像も段階解決
      const idleTimer = setTimeout(() => {
        resolveImagesInDOM();
      }, 500);

      const observer = new MutationObserver(() => {
        if (resolveImagesTimerRef.current) {
          clearTimeout(resolveImagesTimerRef.current);
        }
        resolveImagesTimerRef.current = setTimeout(() => {
          resolveImagesInDOM({ onlyVisible: true });
        }, 120);
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"],
      });

      return () => {
        clearTimeout(idleTimer);
        if (resolveImagesTimerRef.current) {
          clearTimeout(resolveImagesTimerRef.current);
        }
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
            ctx.update(remarkStringifyOptionsCtx, (prev) => ({
              ...prev,
              bullet: "-" as const,
              bulletOther: "*" as const,
              bulletOrdered: "." as const,
              listItemIndent: "one" as const,
              incrementListMarker: true,
              resourceLink: true,
              rule: "-" as const,
              ruleRepetition: 3,
              ruleSpaces: false,
              handlers: {
                ...(prev.handlers || {}),
                list: (node: any, _parent: any, state: any, info: any) => {
                  const exit = state.enter("list");
                  const bulletCurrent = state.bulletCurrent;
                  // node.ordered の場合は常にピリオド '.' を維持
                  // 箇条書きの場合は常にハイフン '-' を維持し、連続リスト時のマーカー交代を防止
                  const bullet = node.ordered
                    ? (state.options.bulletOrdered || ".")
                    : (state.options.bullet || "-");

                  state.bulletCurrent = bullet;
                  const value = state.containerFlow(node, info);
                  state.bulletLastUsed = bullet;
                  state.bulletCurrent = bulletCurrent;
                  exit();
                  return value;
                },
              },
            }));
            ctx.get(listenerCtx).mounted((innerCtx) => {
              // マウント完了時にユーザー操作がまだ行われておらず、かつ未保存変更がないクリーンなファイルの場合のみ
              // Milkdownの初期シリアライズ結果をベースラインとして同期し未保存誤爆を防止
              if (!hasUserInteractedRef.current && !isDirty) {
                try {
                  const editorView = innerCtx.get(editorViewCtx);
                  // 大容量ファイル（300KB以上または2000行以上等）では、初回マウント時の不要な全件シリアライズ（serializer）を
                  // 抑制し、初期レンダリング時のメインスレッドブロックをゼロ化する
                  const isLarge = isLargeContent(initialValue) || Boolean(editorView && editorView.state.doc.nodeSize >= 60000);
                  if (!isLarge) {
                    const serializer = innerCtx.get(serializerCtx);
                    if (editorView && serializer) {
                      const initialSerialized = normalizeLineEndings(serializer(editorView.state.doc));
                      // 未編集（!hasUserInteractedRef.current && !isDirty）の間は prevContentRef.current の
                      // 生ソース（initialValue）を絶対に上書きせず100%保護する
                      onChangeRef.current?.(initialSerialized, { isUserInteraction: false });
                    }
                  }
                } catch {
                  // ignore
                }
              }
            });
            ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
              const normalized = normalizeLineEndings(markdown);
              const isUser = hasUserInteractedRef.current;
              if (isUser || isDirty) {
                prevContentRef.current = normalized;
              }
              onChangeRef.current?.(normalized, { isUserInteraction: isUser });
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
          .use(lineNumbersPlugin)
          .use(mermaidPlugin)
          .use(listener);
      },
      []
    );

    const [loading, getEditor] = useInstance();

    // 外部リンクをブラウザで開く
    const openExternalUrl = useCallback(async (url: string) => {
      if (!isSafeExternalUrl(url)) {
        console.warn("Blocked potentially unsafe external URL:", url);
        return;
      }

      try {
        await openUrl(url);
      } catch (err) {
        console.warn("Failed to open URL via plugin-opener, falling back to window.open:", err);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }, []);

    // 引用（Blockquote）のトグル
    const toggleBlockquote = useCallback(() => {
      markUserInteracted();
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
        markUserInteracted();
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
      [loading, getEditor, tooltipState.linkRange, markUserInteracted]
    );

    // リンクの解除
    const removeLink = useCallback(() => {
      markUserInteracted();
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
    }, [loading, getEditor, tooltipState.linkRange, markUserInteracted]);

    // 選択テキストの書式クリア（Clear Formatting / Bare）
    const clearFormattingAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;

      try {
        const result = editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          if (!view) return false;
          return clearWysiwygFormatting(view);
        });

        if (result) {
          onClearFormatting?.();
        }
        return Boolean(result);
      } catch (err) {
        console.warn("Failed to clear formatting:", err);
        return false;
      }
    }, [loading, getEditor, markUserInteracted, onClearFormatting]);

    // 表（テーブル）の挿入
    const insertTable = useCallback(
      (rows = 3, cols = 3) => {
        markUserInteracted();
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
      [loading, getEditor, markUserInteracted]
    );

    // 行を上に追加
    const addRowBeforeAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addRowBefore(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 行を下に追加
    const addRowAfterAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addRowAfter(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 行を削除
    const deleteRowAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = deleteRow(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 列を左に追加
    const addColBeforeAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addColumnBefore(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 列を右に追加
    const addColAfterAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = addColumnAfter(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 列を削除
    const deleteColAction = useCallback(() => {
      markUserInteracted();
      if (loading) return false;
      const editor = getEditor();
      if (!editor) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const res = deleteColumn(view.state, view.dispatch);
        view.focus();
        return res;
      });
    }, [loading, getEditor, markUserInteracted]);

    // 表を削除
    const deleteTableAction = useCallback(() => {
      markUserInteracted();
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
    }, [loading, getEditor, markUserInteracted]);

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
        markUserInteracted();
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
      [loading, getEditor, resolveImagesInDOM, markUserInteracted]
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
      // 修飾キー付きショートカット（Ctrl+/, Ctrl+S, Ctrl+C 等）や修飾キー単体、ナビゲーションキーでの
      // markUserInteracted 誤爆を完全に防止する。
      // 通常文字入力（e.key.length === 1 かつ修飾キーなし）、Enter、Backspace、Delete 等の能動編集操作のみに限定。
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const isModifierOnly = [
        "Control",
        "Shift",
        "Alt",
        "Meta",
        "CapsLock",
        "Fn",
        "NumLock",
        "ScrollLock",
      ].includes(e.key);
      const isNavigation = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Escape",
      ].includes(e.key);

      if (!hasModifier && !isModifierOnly && !isNavigation) {
        const isEditingKey =
          e.key.length === 1 ||
          e.key === "Enter" ||
          e.key === "Backspace" ||
          e.key === "Delete" ||
          e.key === "Tab";
        if (isEditingKey) {
          markUserInteracted();
        }
      }

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

      // Ctrl+Shift+B / Cmd+Shift+B: 書式クリア
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        clearFormattingAction();
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
          markUserInteracted();
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
          markUserInteracted();
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
        clearFormatting: clearFormattingAction,
        getMarkdown: () => {
          return normalizeLineEndings(prevContentRef.current ?? "");
        },
        hasUserInteracted: () => hasUserInteractedRef.current,
        markUserInteracted,
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
        getScrollTop: () => containerRef.current?.scrollTop || 0,
        setScrollTop: (top: number) => {
          if (containerRef.current) {
            containerRef.current.scrollTop = top;
          }
        },
      }),
      [
        loading,
        getEditor,
        markUserInteracted,
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
        clearFormattingAction,
      ]
    );

    // モード切替時等のスクロール位置復元
    useEffect(() => {
      if (initialScrollTop !== undefined && initialScrollTop > 0 && containerRef.current) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = initialScrollTop;
          }
        });
      }
    }, [initialScrollTop]);

    useEffect(() => {
      if (loading) return;
      const editor = getEditor();
      if (!editor) return;

      if (content !== undefined) {
        const normalized = normalizeLineEndings(content);
        if (normalized !== normalizeLineEndings(prevContentRef.current)) {
          prevContentRef.current = normalized;
          editor.action(replaceAll(normalized));
        }
      }
    }, [content, loading, getEditor]);

    // ファイル切り替え時にスクロール状態をリセット・同期
    useEffect(() => {
      if (containerRef.current) {
        setIsScrolled(containerRef.current.scrollTop > SCROLL_TOP_THRESHOLD);
      }
    }, [filePath]);

    // 行番号表示設定の変更をProseMirrorプラグインへ動的反映
    useEffect(() => {
      setGlobalShowLineNumbers(showLineNumbers);
      if (loading) return;
      const editor = getEditor();
      if (!editor) return;
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const tr = view.state.tr.setMeta(lineNumbersPluginKey, { showLineNumbers });
          view.dispatch(tr);
        });
      } catch (err) {
        console.warn("Failed to dispatch showLineNumbers transaction:", err);
      }
    }, [showLineNumbers, loading, getEditor]);

    return (
      <div className="typori-editor-root relative w-full h-full flex-1 flex flex-col overflow-hidden">
        {/* スクロールに影響されない固定/独立配置のクイックアクションツールバー */}
        <EditorToolbar
          onInsertLink={openLinkModal}
          onToggleBlockquote={toggleBlockquote}
          onInsertTable={() => insertTable(3, 3)}
          onInsertImage={() => fileInputRef.current?.click()}
          onClearFormatting={clearFormattingAction}
          onToggleSourceMode={onToggleSourceMode}
          isFocusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
          isRightSidebarOpen={isRightSidebarOpen}
          isScrolled={isScrolled}
          visible={!isScrolled}
          isHovered={isToolbarHovered}
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
          onUndo={() => {
            markUserInteracted();
            if (!loading && getEditor()) {
              getEditor()?.action(callCommand(undoCommand.key));
            }
          }}
          onRedo={() => {
            markUserInteracted();
            if (!loading && getEditor()) {
              getEditor()?.action(callCommand(redoCommand.key));
            }
          }}
        />

        {/* スクロール可能な本文エディタコンテナ */}
        <div
          ref={containerRef}
          className={`typori-editor-wrapper relative w-full h-full flex-1 overflow-y-auto px-8 py-6 transition-colors ${
            showLineNumbers ? "typori-line-numbers-enabled" : ""
          } ${
            isFocusMode ? "focus-mode" : ""
          } ${
            isDraggingOver ? "bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/50 inset-ring" : ""
          }`}
          onScroll={handleScroll}
          onClick={handleContainerClick}
          onKeyDown={handleKeyDown}
          onBeforeInputCapture={markUserInteracted}
          onCompositionEndCapture={markUserInteracted}
          onPasteCapture={markUserInteracted}
          onDropCapture={markUserInteracted}
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
