import { forwardRef, useMemo, useCallback, useRef, useEffect, useImperativeHandle } from "react";
import CodeMirror, { ReactCodeMirrorRef, EditorView, keymap, Prec } from "@uiw/react-codemirror";
import { EditorSelection } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { clearInlineFormatting } from "../../utils/format";

/**
 * Typori ライトテーマ向けシンタックスハイライトスタイル
 * Tailwind Zinc 配色と調和するモダンなミニマルハイライト
 */
export const typoriLightHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "#09090b", fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#4f46e5", textDecoration: "underline" },
  { tag: t.url, color: "#6366f1" },
  { tag: [t.monospace], color: "#0284c7" },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "#7c3aed" },
  { tag: [t.string, t.special(t.string), t.character], color: "#059669" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#71717a", fontStyle: "italic" },
  { tag: [t.number, t.integer, t.float, t.bool], color: "#ea580c" },
  { tag: [t.variableName, t.attributeName], color: "#27272a" },
  { tag: [t.function(t.variableName), t.propertyName], color: "#2563eb" },
  { tag: [t.typeName, t.className], color: "#0891b2" },
  { tag: [t.tagName], color: "#7c3aed" },
  { tag: [t.punctuation, t.bracket], color: "#71717a" },
]);

/**
 * Typori ダークテーマ向けシンタックスハイライトスタイル
 * Tailwind Zinc 配色と調和する深色系ハイライト
 */
export const typoriDarkHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "#fafafa", fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#818cf8", textDecoration: "underline" },
  { tag: t.url, color: "#a5b4fc" },
  { tag: [t.monospace], color: "#38bdf8" },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "#a78bfa" },
  { tag: [t.string, t.special(t.string), t.character], color: "#34d399" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#a1a1aa", fontStyle: "italic" },
  { tag: [t.number, t.integer, t.float, t.bool], color: "#fb923c" },
  { tag: [t.variableName, t.attributeName], color: "#f4f4f5" },
  { tag: [t.function(t.variableName), t.propertyName], color: "#60a5fa" },
  { tag: [t.typeName, t.className], color: "#22d3ee" },
  { tag: [t.tagName], color: "#a78bfa" },
  { tag: [t.punctuation, t.bracket], color: "#a1a1aa" },
]);


/**
 * SourceEditor 外部公開インターフェース (Ref)
 */
export interface SourceEditorRef {
  /**
   * 選択テキストの書式（始まりと終わりのあるインライン記法・複合記法全般）をクリアして
   * 素のテキストに戻し、前後の装飾記号を適切に自動分割・置換します。
   * 選択範囲がない（空選択）場合、または装飾が含まれない場合は false を返します。
   */
  clearFormatting: () => boolean;
  /**
   * エディタにフォーカスを当てます。
   */
  focus: () => void;
  /**
   * 現在のスクロール位置（ピクセル）を取得します。
   */
  getScrollTop: () => number;
  /**
   * スクロール位置を設定します。
   */
  setScrollTop: (top: number) => void;
  /**
   * CodeMirror の EditorView インスタンス（存在する場合）を取得します。
   */
  getView: () => EditorView | undefined;
}

/**
 * CodeMirror 6 において選択テキストのインライン書式クリアを実行するコマンド/関数
 * 
 * 選択範囲（Selection）が存在する場合に clearInlineFormatting を呼び出し、
 * 最小限の変更範囲（Minimal Change Range）を特定して単一トランザクションで置換します。
 * 選択範囲が空（カーソルのみ）の場合は何もしません（空選択ガード）。
 * 
 * @param view CodeMirror EditorView
 * @returns 書式クリアが実行された場合は true、空選択や変更なしの場合は false
 */
export function clearFormatting(view: EditorView): boolean {
  const { state, dispatch } = view;
  const ranges = state.selection.ranges.filter((r) => !r.empty);
  if (ranges.length === 0) {
    // 空選択ガード: 選択範囲がない場合は何もしない
    return false;
  }

  let docText = state.doc.toString();
  let anyChanged = false;
  // 右から左（降順）に適用してオフセットズレを防止
  const sortedRanges = [...ranges].sort((a, b) => b.from - a.from);
  const newSelectionRanges: Array<{ anchor: number; head: number }> = [];

  for (const range of sortedRanges) {
    const result = clearInlineFormatting(docText, range.from, range.to);
    if (result.changed) {
      anyChanged = true;
      docText = result.text;
      newSelectionRanges.push({ anchor: result.from, head: result.to });
    } else {
      newSelectionRanges.push({ anchor: range.from, head: range.to });
    }
  }

  if (!anyChanged) {
    return false;
  }

  // 昇順に復元
  newSelectionRanges.reverse();

  // 元テキストとの最小変更範囲（diff）を特定して局所置換
  const originalDoc = state.doc.toString();
  let start = 0;
  while (
    start < originalDoc.length &&
    start < docText.length &&
    originalDoc[start] === docText[start]
  ) {
    start++;
  }

  let oldEnd = originalDoc.length;
  let newEnd = docText.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    originalDoc[oldEnd - 1] === docText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  dispatch({
    changes: {
      from: start,
      to: oldEnd,
      insert: docText.slice(start, newEnd),
    },
    selection: EditorSelection.create(
      newSelectionRanges.map((r) => EditorSelection.range(r.anchor, r.head))
    ),
    userEvent: "format.clear",
    scrollIntoView: true,
  });

  return true;
}

export const clearFormattingCommand = clearFormatting;

export interface SourceEditorProps {
  content: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  onSave?: () => void;
  onExitSourceMode?: () => void;
  onToggleSourceMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  showLineNumbers?: boolean;
  filePath?: string | null;
  placeholder?: string;
  initialScrollTop?: number;
  onClearFormatting?: () => void;
}

export const SourceEditor = forwardRef<SourceEditorRef, SourceEditorProps>(
  function SourceEditor(
    {
      content,
      onChange,
      theme = "light",
      onSave,
      onExitSourceMode,
      onToggleSourceMode,
      isFocusMode = false,
      onToggleFocusMode,
      showLineNumbers = true,
      placeholder = "Markdownを入力...",
      initialScrollTop,
      onClearFormatting,
    },
    ref
  ) {
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    // モード切替時のスクロール位置復元
    useEffect(() => {
      if (initialScrollTop !== undefined && initialScrollTop > 0) {
        requestAnimationFrame(() => {
          const scroller = editorRef.current?.view?.scrollDOM || document.querySelector(".cm-scroller");
          if (scroller) {
            scroller.scrollTop = initialScrollTop;
          }
        });
      }
    }, [initialScrollTop]);

    // コールバックの最新参照を保持（CodeMirror拡張を不要に再構築せず常に最新のハンドラを実行）
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;
    const onToggleSourceModeRef = useRef(onToggleSourceMode);
    onToggleSourceModeRef.current = onToggleSourceMode;
    const onExitSourceModeRef = useRef(onExitSourceMode);
    onExitSourceModeRef.current = onExitSourceMode;
    const onToggleFocusModeRef = useRef(onToggleFocusMode);
    onToggleFocusModeRef.current = onToggleFocusMode;
    const onClearFormattingRef = useRef(onClearFormatting);
    onClearFormattingRef.current = onClearFormatting;

    const handleClearFormatting = useCallback(() => {
      const view = editorRef.current?.view;
      if (!view) return false;
      const success = clearFormatting(view);
      if (success) {
        if (onClearFormattingRef.current) {
          onClearFormattingRef.current();
        }
        return true;
      }
      return false;
    }, []);

    // 外部公開 ref のハンドリング
    useImperativeHandle(
      ref,
      () => ({
        clearFormatting: handleClearFormatting,
        focus: () => {
          editorRef.current?.view?.focus();
        },
        getScrollTop: () => {
          const scroller = editorRef.current?.view?.scrollDOM;
          return scroller?.scrollTop || 0;
        },
        setScrollTop: (top: number) => {
          const scroller = editorRef.current?.view?.scrollDOM;
          if (scroller) {
            scroller.scrollTop = top;
          }
        },
        getView: () => editorRef.current?.view,
      }),
      [handleClearFormatting]
    );

    const handleToggleOrExit = useCallback(() => {
      const toggle = onToggleSourceModeRef.current || onExitSourceModeRef.current;
      if (toggle) {
        toggle();
        return true;
      }
      return false;
    }, []);

    // DOMレベルでのショートカット制御
    // CodeMirrorデフォルトのコメントトグル (Mod-/ -> toggleComment '<!-- -->') やウィンドウへの不要な伝播を確実に抑止
    const domEventExtension = useMemo(() => {
      return Prec.highest(
        EditorView.domEventHandlers({
          keydown(event, view) {
            const isSlashKey =
              event.key === "/" ||
              (event.code === "Slash" && !event.shiftKey) ||
              event.code === "NumpadDivide";
            if ((event.ctrlKey || event.metaKey) && isSlashKey && !event.altKey) {
              event.preventDefault();
              event.stopPropagation();
              handleToggleOrExit();
              return true;
            }

            // Ctrl+Shift+B / Cmd+Shift+B: 書式クリア
            const isBKey =
              event.key === "b" ||
              event.key === "B" ||
              event.code === "KeyB";
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && isBKey && !event.altKey) {
              event.preventDefault();
              event.stopPropagation();
              const success = clearFormatting(view);
              if (success && onClearFormattingRef.current) {
                onClearFormattingRef.current();
              }
              return true;
            }

            return false;
          },
        })
      );
    }, [handleToggleOrExit]);

    // Ctrl+S / Cmd+S による保存、Ctrl+/ によるモード切替、Ctrl+Shift+B による書式クリア、F8 によるフォーカス切替
    // CodeMirror の defaultKeymap (Mod-/ -> toggleComment '<!-- -->') よりも確実に優先するため Prec.highest を適用
    const keymapExtension = useMemo(() => {
      return Prec.highest(
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              if (onSaveRef.current) {
                onSaveRef.current();
                return true;
              }
              return false;
            },
            preventDefault: true,
            stopPropagation: true,
          },
          {
            key: "Mod-/",
            run: () => {
              return handleToggleOrExit();
            },
            preventDefault: true,
            stopPropagation: true,
          },
          {
            key: "Mod-Shift-b",
            run: (view) => {
              const success = clearFormatting(view);
              if (success && onClearFormattingRef.current) {
                onClearFormattingRef.current();
              }
              return success;
            },
            preventDefault: true,
            stopPropagation: true,
          },
          {
            key: "Mod-Shift-B",
            run: (view) => {
              const success = clearFormatting(view);
              if (success && onClearFormattingRef.current) {
                onClearFormattingRef.current();
              }
              return success;
            },
            preventDefault: true,
            stopPropagation: true,
          },
          {
            key: "F8",
            run: () => {
              if (onToggleFocusModeRef.current) {
                onToggleFocusModeRef.current();
                return true;
              }
              return false;
            },
            preventDefault: true,
            stopPropagation: true,
          },
        ])
      );
    }, [handleToggleOrExit]);

  // Typori向けのエディタカスタムスタイル
  const customTheme = useMemo(() => {
    const isDark = theme === "dark";
    return EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: "14px",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          backgroundColor: isDark ? "#18181b" : "#ffffff",
          color: isDark ? "#f4f4f5" : "#27272a",
        },
        ".cm-scroller": {
          overflow: "auto",
          lineHeight: "1.7",
          paddingBottom: "120px",
          minHeight: "100%",
        },
        ".cm-content": {
          padding: "24px 32px",
          margin: "0",
          boxSizing: "border-box",
        },
        ".cm-gutters": {
          backgroundColor: isDark ? "#18181b" : "#ffffff",
          borderColor: isDark ? "#27272a" : "#f4f4f5",
          color: isDark ? "#71717a" : "#a1a1aa",
          borderRightWidth: "1px",
          borderRightStyle: "solid",
          userSelect: "none",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          padding: "0 8px 0 12px",
          minWidth: "36px",
          textAlign: "right",
        },
        ".cm-activeLine": {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(99, 102, 241, 0.05)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(99, 102, 241, 0.08)",
          color: "#6366f1",
          fontWeight: "600",
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-selectionMatch": {
          backgroundColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
        },
      },
      { dark: isDark }
    );
  }, [theme]);

  const highlightExtension = useMemo(() => {
    return syntaxHighlighting(theme === "dark" ? typoriDarkHighlightStyle : typoriLightHighlightStyle);
  }, [theme]);

  const markdownExtension = useMemo(() => {
    return markdown({
      base: markdownLanguage,
      codeLanguages: languages,
    });
  }, []);

  const extensions = useMemo(() => {
    return [
      markdownExtension,
      highlightExtension,
      EditorView.lineWrapping,
      domEventExtension,
      keymapExtension,
      customTheme,
    ];
  }, [markdownExtension, highlightExtension, domEventExtension, keymapExtension, customTheme]);

  const basicSetupOptions = useMemo(
    () => ({
      lineNumbers: showLineNumbers,
      highlightActiveLineGutter: showLineNumbers,
      highlightSpecialChars: true,
      history: true,
      foldGutter: true,
      drawSelection: true,
      dropCursor: true,
      allowMultipleSelections: true,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: true,
      rectangularSelection: true,
      crosshairCursor: true,
      highlightActiveLine: true,
      highlightSelectionMatches: true,
      closeBracketsKeymap: true,
      defaultKeymap: true,
      searchKeymap: true,
      historyKeymap: true,
      foldKeymap: true,
      completionKeymap: true,
    }),
    [showLineNumbers]
  );

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      {/* ソースコードモードのヘッダーバナー */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-xs select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">
            &lt;/&gt;
          </span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            Markdown ソース直接編集モード
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            (プレーンテキストとして直接編集)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border shadow-2xs transition-colors cursor-pointer ${
                isFocusMode
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-semibold"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
              }`}
              title={isFocusMode ? "フォーカスモードを解除 (F8)" : "フォーカスモードに切り替え (F8)"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3" />
              </svg>
              <span>{isFocusMode ? "フォーカス中" : "フォーカス"}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700/60 rounded border border-zinc-200 dark:border-zinc-600 ml-0.5">
                F8
              </kbd>
            </button>
          )}

          {(onExitSourceMode || onToggleSourceMode) && (
            <button
              onClick={onExitSourceMode || onToggleSourceMode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs transition-colors cursor-pointer"
              title="WYSIWYGエディタに戻る (Ctrl + /)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>WYSIWYG表示に戻る</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700/60 rounded border border-zinc-200 dark:border-zinc-600 ml-1">
                Ctrl + /
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror エディタ本体 */}
      <div className={`flex-1 min-h-0 w-full overflow-hidden ${isFocusMode ? "cm-focus-mode" : ""}`}>
        <CodeMirror
          ref={editorRef}
          value={content}
          height="100%"
          theme={theme === "dark" ? "dark" : "light"}
          extensions={extensions}
          onChange={handleChange}
          placeholder={placeholder}
          basicSetup={basicSetupOptions}
          className="h-full text-sm"
        />
      </div>
    </div>
  );
});

export default SourceEditor;
