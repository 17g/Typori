import { useEffect, useState, useCallback } from "react";
import TyporiEditor from "./components/Editor";
import Sidebar, { FileEntry } from "./components/Sidebar";
import { getCurrentDir, getParentDir, readDir } from "./api/fs";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
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
  const handleSelectFile = (entry: FileEntry) => {
    setSelectedPath(entry.path);
  };

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
          <span>Markdown Mode</span>
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
        <TyporiEditor />
      </div>
    </main>
  );
}

export default App;
