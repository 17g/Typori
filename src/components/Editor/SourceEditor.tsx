import { useMemo, useCallback, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef, EditorView, keymap, oneDark, Prec } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

export interface SourceEditorProps {
  content: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  onSave?: () => void;
  onExitSourceMode?: () => void;
  onToggleSourceMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  filePath?: string | null;
  placeholder?: string;
}

export function SourceEditor({
  content,
  onChange,
  theme = "light",
  onSave,
  onExitSourceMode,
  onToggleSourceMode,
  isFocusMode = false,
  onToggleFocusMode,
  placeholder = "Markdownを入力...",
}: SourceEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // コールバックの最新参照を保持（CodeMirror拡張を不要に再構築せず常に最新のハンドラを実行）
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onToggleSourceModeRef = useRef(onToggleSourceMode);
  onToggleSourceModeRef.current = onToggleSourceMode;
  const onExitSourceModeRef = useRef(onExitSourceMode);
  onExitSourceModeRef.current = onExitSourceMode;
  const onToggleFocusModeRef = useRef(onToggleFocusMode);
  onToggleFocusModeRef.current = onToggleFocusMode;

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
        keydown(event, _view) {
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
          return false;
        },
      })
    );
  }, [handleToggleOrExit]);

  // Ctrl+S / Cmd+S による保存、Ctrl+/ によるモード切替、F8 によるフォーカス切替
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
        },
        ".cm-content": {
          padding: "24px 32px",
          maxWidth: "960px",
          margin: "0 auto",
        },
        ".cm-gutters": {
          backgroundColor: isDark ? "#18181b" : "#ffffff",
          borderColor: isDark ? "#27272a" : "#f4f4f5",
          color: isDark ? "#71717a" : "#a1a1aa",
          borderRightWidth: "1px",
          userSelect: "none",
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

  const extensions = useMemo(() => {
    return [
      markdown(),
      EditorView.lineWrapping,
      domEventExtension,
      keymapExtension,
      customTheme,
    ];
  }, [domEventExtension, keymapExtension, customTheme]);

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      {/* ソースコードモードのヘッダーバナー */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-xs select-none">
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
      <div className={`flex-1 w-full h-full overflow-hidden ${isFocusMode ? "cm-focus-mode" : ""}`}>
        <CodeMirror
          ref={editorRef}
          value={content}
          height="100%"
          theme={theme === "dark" ? oneDark : "light"}
          extensions={extensions}
          onChange={handleChange}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
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
          }}
          className="h-full text-sm"
        />
      </div>
    </div>
  );
}

export default SourceEditor;
