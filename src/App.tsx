import { useEffect, useState, useCallback } from "react";
import TyporiEditor from "./components/Editor";
import Sidebar, { FileEntry } from "./components/Sidebar";
import { getCurrentDir, getParentDir, openFile, readDir } from "./api/fs";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
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

  // ファイル選択時
  const handleSelectFile = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) return;

    setSelectedPath(entry.path);
    setIsFileLoading(true);
    setFileError(null);

    try {
      const content = await openFile(entry.path);
      setFileContent(content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to open file '${entry.path}':`, err);
      setFileError(`ファイルの読み込みに失敗しました: ${errMsg}`);
    } finally {
      setIsFileLoading(false);
    }
  }, []);

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

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const rootEntries = currentDirectory ? directoryContents[currentDirectory] || [] : [];
  const currentFileName = selectedPath
    ? selectedPath.split(/[/\\]/).filter(Boolean).pop() || selectedPath
    : null;

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSidebar}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="サイドバーの表示切替"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>
          <div className="font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
            Typori
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentFileName ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 max-w-[300px] truncate"
              title={selectedPath ?? undefined}
            >
              <svg
                className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="font-medium truncate">{currentFileName}</span>
            </div>
          ) : (
            <span>Markdown Mode</span>
          )}
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
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
        />
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900 relative">
          {isFileLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 gap-2">
              <svg
                className="w-6 h-6 animate-spin text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
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
      </div>
    </main>
  );
}

export default App;
