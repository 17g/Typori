import { useMemo, useCallback, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef, EditorView, keymap, oneDark } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

export interface SourceEditorProps {
  content: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  onSave?: () => void;
  onExitSourceMode?: () => void;
  filePath?: string | null;
  placeholder?: string;
}

export function SourceEditor({
  content,
  onChange,
  theme = "light",
  onSave,
  onExitSourceMode,
  placeholder = "Markdownを入力...",
}: SourceEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Ctrl+S / Cmd+S による保存キーマップ
  const saveExtension = useMemo(() => {
    return keymap.of([
      {
        key: "Mod-s",
        run: () => {
          if (onSave) {
            onSave();
            return true;
          }
          return false;
        },
      },
    ]);
  }, [onSave]);

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
      saveExtension,
      customTheme,
    ];
  }, [saveExtension, customTheme]);

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

        {onExitSourceMode && (
          <button
            onClick={onExitSourceMode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs transition-colors cursor-pointer"
            title="WYSIWYGエディタに戻る"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>WYSIWYG表示に戻る</span>
          </button>
        )}
      </div>

      {/* CodeMirror エディタ本体 */}
      <div className="flex-1 w-full h-full overflow-hidden">
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
