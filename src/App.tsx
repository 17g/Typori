import { useEffect, useState, useCallback, useRef } from "react";
import TyporiEditor from "./components/Editor";
import Sidebar, { FileEntry } from "./components/Sidebar";
import { getCurrentDir, getParentDir, openFile, readDir, saveFile, createFile } from "./api/fs";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [directoryContents, setDirectoryContents] = useState<Record<string, FileEntry[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  // 指定ディレクトリの読み込み
  const loadDirectory = useCallback(async (dirPath: string, isRoot = false) => {
    if (isRoot) {
      setIsLoadingRoot(true);
      setRootError(null);
    } else {
      setLoadingPaths((prev) => new Set(prev).add(dirPath));
    }

    try {
      const entries = await readDir(dirPath);
      setDirectoryContents((prev) => ({
        ...prev,
        [dirPath]: entries,
      }));
      if (isRoot) {
        setCurrentDirectory(dirPath);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (isRoot) {
        setRootError(errMsg);
      } else {
        console.error(`Failed to read directory '${dirPath}':`, err);
      }
    } finally {
      if (isRoot) {
        setIsLoadingRoot(false);
      } else {
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(dirPath);
          return next;
        });
      }
    }
  }, []);

  // 初期起動時にカレントディレクトリを取得・読み込み
  useEffect(() => {
    let isMounted = true;
    const initWorkspace = async () => {
      try {
        const cwd = await getCurrentDir();
        if (isMounted) {
          await loadDirectory(cwd, true);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not determine current directory from Tauri:", err);
          setRootError("作業ディレクトリの取得に失敗しました。フォルダパスを指定してください。");
        }
      }
    };

    initWorkspace();

    return () => {
      isMounted = false;
    };
  }, [loadDirectory]);

  const isDirty = Boolean(
    selectedPath !== null &&
    fileContent !== null &&
    savedContent !== null &&
    fileContent !== savedContent
  );

  // ファイル保存
  const handleSave = useCallback(async () => {
    if (!selectedPath || fileContent === null || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveFile(selectedPath, fileContent);
      setSavedContent(fileContent);
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus(null);
      }, 2500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to save file '${selectedPath}':`, err);
      setSaveError(`保存に失敗しました: ${errMsg}`);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [selectedPath, fileContent, isSaving]);

  // ショートカット (Ctrl+S / Cmd+S で保存, Ctrl+\ / Cmd+\ でサイドバー開閉)
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);
  const handleToggleSidebarRef = useRef(handleToggleSidebar);
  handleToggleSidebarRef.current = handleToggleSidebar;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 保存
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
      // サイドバートグル (Ctrl+\ / Cmd+\)
      if ((e.ctrlKey || e.metaKey) && (e.key === "\\" || e.key === "¥" || e.code === "Backslash")) {
        e.preventDefault();
        handleToggleSidebarRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 未保存時のページ離脱防止
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // ファイル選択時
  const handleSelectFile = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) return;

    if (isDirty && entry.path !== selectedPath) {
      const ok = window.confirm("保存されていない変更があります。保存せずに別のファイルを開きますか？");
      if (!ok) return;
    }

    setSelectedPath(entry.path);
    setIsFileLoading(true);
    setFileError(null);
    setSaveError(null);
    setSaveStatus(null);

    try {
      const content = await openFile(entry.path);
      setFileContent(content);
      setSavedContent(content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to open file '${entry.path}':`, err);
      setFileError(`ファイルの読み込みに失敗しました: ${errMsg}`);
    } finally {
      setIsFileLoading(false);
    }
  }, [isDirty, selectedPath]);

  // ディレクトリ展開・折りたたみ
  const handleToggleDirectory = async (entry: FileEntry) => {
    const isExpanded = expandedPaths.has(entry.path);
    if (isExpanded) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        next.delete(entry.path);
        return next;
      });
    } else {
      setExpandedPaths((prev) => new Set(prev).add(entry.path));
      if (!directoryContents[entry.path]) {
        await loadDirectory(entry.path, false);
      }
    }
  };

  // 親ディレクトリへ移動
  const handleNavigateUp = async () => {
    if (!currentDirectory) return;
    try {
      const parent = await getParentDir(currentDirectory);
      if (parent && parent !== currentDirectory) {
        setExpandedPaths(new Set());
        await loadDirectory(parent, true);
      }
    } catch (err) {
      console.error("Failed to navigate to parent directory:", err);
    }
  };

  // ディレクトリツリー更新
  const handleRefresh = async () => {
    if (!currentDirectory) return;
    await loadDirectory(currentDirectory, true);
    for (const path of expandedPaths) {
      await loadDirectory(path, false);
    }
  };

  // 指定パスを開く
  const handleOpenDirectory = async (path: string) => {
    setExpandedPaths(new Set());
    await loadDirectory(path, true);
  };

  // 新規ファイル作成
  const handleCreateFile = async (fileName: string): Promise<boolean> => {
    if (!currentDirectory) {
      alert("ファイルを作成するフォルダが選択されていません。");
      return false;
    }

    if (isDirty) {
      const ok = window.confirm("保存されていない変更があります。新規ファイルを作成して切り替えますか？");
      if (!ok) return false;
    }

    const separator = currentDirectory.includes("\\") ? "\\" : "/";
    const fullPath =
      currentDirectory.endsWith("/") || currentDirectory.endsWith("\\")
        ? `${currentDirectory}${fileName}`
        : `${currentDirectory}${separator}${fileName}`;

    const title = fileName.replace(/\.[^/.]+$/, "");
    const initialContent = `# ${title}\n\n`;

    try {
      const newEntry = await createFile(fullPath, initialContent);
      await loadDirectory(currentDirectory, true);
      setSelectedPath(newEntry.path);
      setFileContent(initialContent);
      setSavedContent(initialContent);
      setSaveStatus(null);
      setSaveError(null);
      setFileError(null);
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to create file '${fullPath}':`, err);
      throw new Error(`新規ファイルの作成に失敗しました: ${errMsg}`);
    }
  };

  const rootEntries = currentDirectory ? directoryContents[currentDirectory] || [] : [];
  const currentFileName = selectedPath
    ? selectedPath.split(/[/\\]/).filter(Boolean).pop() || selectedPath
    : null;
  const currentDirName = currentDirectory
    ? currentDirectory.split(/[/\\]/).filter(Boolean).pop() || currentDirectory
    : null;

  // Typoraライクなドキュメント統計
  const activeText = fileContent ?? "";
  const charCount = activeText.replace(/\r\n/g, "\n").length;
  const wordCount = activeText.trim() ? activeText.trim().split(/\s+/).length : 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* サイドバー（スライド開閉対応） */}
      <Sidebar
        currentDirectory={currentDirectory}
        entries={rootEntries}
        selectedPath={selectedPath}
        directoryContents={directoryContents}
        expandedPaths={expandedPaths}
        loadingPaths={loadingPaths}
        isLoading={isLoadingRoot}
        error={rootError}
        isOpen={isSidebarOpen}
        onToggleOpen={handleToggleSidebar}
        onSelectFile={handleSelectFile}
        onToggleDirectory={handleToggleDirectory}
        onNavigateUp={handleNavigateUp}
        onRefresh={handleRefresh}
        onOpenDirectory={handleOpenDirectory}
        onCreateFile={handleCreateFile}
      />

      {/* メインエディタ領域（ヘッダーレス・ミニマルレイアウト） */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* ミニマルトップバー（タイトル & トグル & 保存アクション） */}
        <header className="h-9 px-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 select-none border-b border-zinc-100/80 dark:border-zinc-800/40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs z-10">
          {/* 左: サイドバートグル & アプリ名 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSidebar}
              className={`p-1 rounded transition-colors ${
                isSidebarOpen
                  ? "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
              title="サイドバーの表示切替 (Ctrl+\)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={1.8} />
                <line x1="9" y1="4" x2="9" y2="20" strokeWidth={1.8} />
              </svg>
            </button>
            <span className="font-semibold text-xs tracking-wider text-zinc-400/80 dark:text-zinc-500">
              Typori
            </span>
          </div>

          {/* 中央: ファイル名 / 未保存インジケータ */}
          <div className="flex items-center gap-2 min-w-0 px-2">
            {currentFileName ? (
              <div
                className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 max-w-[280px] sm:max-w-md truncate"
                title={selectedPath ?? undefined}
              >
                <span className="font-medium text-xs truncate">{currentFileName}</span>
                {isDirty && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
                    title="未保存の変更があります (Ctrl+S で保存)"
                  />
                )}
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] italic">
                無題のドキュメント
              </span>
            )}
          </div>

          {/* 右: 保存ボタン / ステータス */}
          <div className="flex items-center gap-2">
            {currentFileName && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  isSaving
                    ? "text-zinc-400 bg-zinc-100 dark:bg-zinc-800 cursor-wait"
                    : saveStatus === "saved"
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60"
                    : saveStatus === "error"
                    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60"
                    : isDirty
                    ? "text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="保存 (Ctrl+S)"
              >
                {isSaving ? (
                  <>
                    <svg className="w-3 h-3 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>保存中...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>保存完了</span>
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <svg className="w-3 h-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>保存失敗</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>{isDirty ? "保存 (Ctrl+S)" : "保存済み"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* 保存失敗通知 */}
        {saveError && (
          <div className="bg-rose-500 text-white text-xs px-4 py-1 flex items-center justify-between shadow-xs z-10">
            <span className="truncate">{saveError}</span>
            <button
              onClick={() => setSaveError(null)}
              className="ml-2 hover:bg-rose-600 rounded px-1.5 py-0.5 text-xs font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {/* エディタコンテンツ */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900 relative">
          {isFileLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 gap-2">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>ファイルを読み込み中...</span>
            </div>
          ) : fileError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="max-w-md p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs">
                <p className="font-semibold text-sm mb-1">ファイルを開けませんでした</p>
                <p className="mb-3 break-all">{fileError}</p>
                {selectedPath && (
                  <button
                    onClick={() => {
                      const entry: FileEntry = {
                        name: currentFileName || "",
                        path: selectedPath,
                        is_dir: false,
                      };
                      handleSelectFile(entry);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    再試行
                  </button>
                )}
              </div>
            </div>
          ) : (
            <TyporiEditor
              key={selectedPath ?? "__welcome__"}
              content={fileContent ?? undefined}
              filePath={selectedPath}
              onChange={(markdown) => {
                setFileContent(markdown);
              }}
            />
          )}
        </div>

        {/* Typoraライクなステータスバー */}
        <footer className="h-6 px-4 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 select-none bg-zinc-50/60 dark:bg-zinc-950/40 border-t border-zinc-100 dark:border-zinc-800/40">
          <div className="flex items-center gap-2 truncate">
            {currentDirName && (
              <span className="truncate max-w-[200px]" title={currentDirectory ?? undefined}>
                📁 {currentDirName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{wordCount} 単語</span>
            <span>{charCount} 文字</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-500"}`} />
              <span>{isDirty ? "未保存" : "同期済み"}</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
