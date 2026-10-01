import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SidebarProps, FileEntry } from "./types";
import { SidebarItem } from "./SidebarItem";
import { searchFiles } from "../../api/fs";

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

function buildTreeFromSearchResults(
  rootDir: string,
  matchedEntries: FileEntry[],
  collapsedPaths: Set<string>
): {
  filteredEntries: FileEntry[];
  filteredDirectoryContents: Record<string, FileEntry[]>;
  expandedPaths: Set<string>;
  totalMatches: number;
} {
  const normRoot = normalizePath(rootDir);
  const rootEntriesMap = new Map<string, FileEntry>();
  const dirContentsMap = new Map<string, Map<string, FileEntry>>();
  const autoExpanded = new Set<string>();

  for (const entry of matchedEntries) {
    const normEntryPath = normalizePath(entry.path);

    if (!normEntryPath.startsWith(normRoot)) {
      rootEntriesMap.set(entry.path, entry);
      continue;
    }

    const rel = normEntryPath.slice(normRoot.length).replace(/^\/+/, "");
    if (!rel) continue;

    const segments = rel.split("/");
    let curPath = normRoot;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLeaf = i === segments.length - 1;
      const parentPath = curPath;
      curPath = `${curPath}/${segment}`;

      if (!isLeaf || entry.is_dir) {
        if (!collapsedPaths.has(curPath)) {
          autoExpanded.add(curPath);
        }
      }

      const item: FileEntry = isLeaf
        ? entry
        : {
            name: segment,
            path: curPath,
            is_dir: true,
          };

      if (i === 0) {
        if (!rootEntriesMap.has(item.path) || !item.is_dir) {
          rootEntriesMap.set(item.path, item);
        }
      } else {
        if (!dirContentsMap.has(parentPath)) {
          dirContentsMap.set(parentPath, new Map());
        }
        const childrenMap = dirContentsMap.get(parentPath)!;
        if (!childrenMap.has(item.path) || !item.is_dir) {
          childrenMap.set(item.path, item);
        }
      }
    }
  }

  const sortEntries = (list: FileEntry[]) =>
    list.sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

  const filteredEntries = sortEntries(Array.from(rootEntriesMap.values()));
  const filteredDirectoryContents: Record<string, FileEntry[]> = {};
  for (const [dir, childrenMap] of dirContentsMap.entries()) {
    filteredDirectoryContents[dir] = sortEntries(Array.from(childrenMap.values()));
  }

  return {
    filteredEntries,
    filteredDirectoryContents,
    expandedPaths: autoExpanded,
    totalMatches: matchedEntries.length,
  };
}

function filterLoadedTree(
  entries: FileEntry[],
  directoryContents: Record<string, FileEntry[]> | undefined,
  query: string,
  collapsedPaths: Set<string>
): {
  filteredEntries: FileEntry[];
  filteredDirectoryContents: Record<string, FileEntry[]>;
  expandedPaths: Set<string>;
  totalMatches: number;
} {
  const q = query.trim().toLowerCase();
  const filteredContents: Record<string, FileEntry[]> = {};
  const autoExpanded = new Set<string>();
  let matchCount = 0;

  function filterList(list: FileEntry[]): FileEntry[] {
    const result: FileEntry[] = [];

    for (const item of list) {
      const selfMatch = item.name.toLowerCase().includes(q);
      if (selfMatch) {
        matchCount++;
      }

      if (item.is_dir) {
        const rawChildren = directoryContents?.[item.path] || [];
        const filteredChildren = filterList(rawChildren);

        if (selfMatch || filteredChildren.length > 0) {
          result.push(item);
          filteredContents[item.path] = filteredChildren;
          if (filteredChildren.length > 0 && !collapsedPaths.has(item.path)) {
            autoExpanded.add(item.path);
          }
        }
      } else if (selfMatch) {
        result.push(item);
      }
    }

    return result;
  }

  const filteredEntries = filterList(entries);

  return {
    filteredEntries,
    filteredDirectoryContents: filteredContents,
    expandedPaths: autoExpanded,
    totalMatches: matchCount,
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDirectory,
  entries = [],
  selectedPath = null,
  directoryContents,
  expandedPaths,
  loadingPaths,
  isLoading = false,
  error = null,
  isOpen = true,
  onToggleOpen,
  onSelectFile,
  onToggleDirectory,
  onNavigateUp,
  onRefresh,
  onOpenDirectory,
  onCreateFile,
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("Untitled.md");
  const [isCreating, setIsCreating] = useState(false);
  const [createFileError, setCreateFileError] = useState<string | null>(null);

  // 検索・フィルタリング用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [backendSearchResults, setBackendSearchResults] = useState<FileEntry[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [collapsedPathsInSearch, setCollapsedPathsInSearch] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  // カレントディレクトリ変更時に検索リセット
  useEffect(() => {
    setSearchQuery("");
    setBackendSearchResults(null);
    setCollapsedPathsInSearch(new Set());
  }, [currentDirectory]);

  // バックエンド検索 (デバウンス120ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !currentDirectory) {
      setBackendSearchResults(null);
      setIsSearching(false);
      setCollapsedPathsInSearch(new Set());
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchFiles(currentDirectory, trimmed, 300);
        if (isMounted) {
          setBackendSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        console.warn("searchFiles error:", err);
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, currentDirectory]);

  // Ctrl+F / Cmd+F でサイドバー検索にフォーカス
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (isOpen) {
          const activeEl = document.activeElement;
          const isEditorFocused =
            activeEl?.closest(".milkdown") || activeEl?.closest(".cm-editor");
          if (!isEditorFocused || sidebarContainerRef.current?.contains(activeEl)) {
            e.preventDefault();
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleStartEditPath = () => {
    setCustomPath(currentDirectory || "");
    setIsEditingPath(true);
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim() && onOpenDirectory) {
      onOpenDirectory(customPath.trim());
      setIsEditingPath(false);
    }
  };

  const handleStartCreateFile = () => {
    setIsCreatingFile(true);
    setNewFileName("Untitled.md");
    setCreateFileError(null);
  };

  const handleCancelCreateFile = () => {
    setIsCreatingFile(false);
    setCreateFileError(null);
  };

  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let name = newFileName.trim();
    if (!name) {
      setCreateFileError("ファイル名を入力してください");
      return;
    }
    if (!name.includes(".")) {
      name = `${name}.md`;
    }

    if (onCreateFile) {
      setIsCreating(true);
      setCreateFileError(null);
      try {
        const result = await onCreateFile(name);
        if (result !== false) {
          setIsCreatingFile(false);
        }
      } catch (err) {
        setCreateFileError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsCreating(false);
      }
    }
  };

  // 表示ツリーデータの計算（検索クエリがある場合はフィルタリング）
  const displayTree = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return {
        isFiltering: false,
        entries,
        directoryContents: directoryContents || {},
        expandedPaths: expandedPaths || new Set<string>(),
        totalMatches: entries.length,
      };
    }

    if (backendSearchResults !== null && currentDirectory) {
      const res = buildTreeFromSearchResults(
        currentDirectory,
        backendSearchResults,
        collapsedPathsInSearch
      );
      return {
        isFiltering: true,
        entries: res.filteredEntries,
        directoryContents: res.filteredDirectoryContents,
        expandedPaths: res.expandedPaths,
        totalMatches: res.totalMatches,
      };
    }

    const res = filterLoadedTree(
      entries,
      directoryContents,
      trimmed,
      collapsedPathsInSearch
    );
    return {
      isFiltering: true,
      entries: res.filteredEntries,
      directoryContents: res.filteredDirectoryContents,
      expandedPaths: res.expandedPaths,
      totalMatches: res.totalMatches,
    };
  }, [
    searchQuery,
    entries,
    directoryContents,
    expandedPaths,
    backendSearchResults,
    currentDirectory,
    collapsedPathsInSearch,
  ]);

  // 検索中フォルダ展開/折りたたみのハンドラ
  const handleToggleDirectoryItem = useCallback(
    (entry: FileEntry) => {
      if (!displayTree.isFiltering) {
        onToggleDirectory?.(entry);
        return;
      }

      const isCurrentlyExpanded = displayTree.expandedPaths.has(entry.path);
      setCollapsedPathsInSearch((prev) => {
        const next = new Set(prev);
        if (isCurrentlyExpanded) {
          next.add(entry.path);
        } else {
          next.delete(entry.path);
        }
        return next;
      });

      if (!directoryContents?.[entry.path]) {
        onToggleDirectory?.(entry);
      }
    },
    [displayTree.isFiltering, displayTree.expandedPaths, onToggleDirectory, directoryContents]
  );

  const dirName = currentDirectory
    ? currentDirectory.split(/[/\\]/).filter(Boolean).pop() || currentDirectory
    : "未選択";

  return (
    <aside
      className={`h-full border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-950/95 flex flex-col flex-shrink-0 select-none transition-[width,opacity] duration-200 ease-in-out overflow-hidden ${
        isOpen ? "w-64 border-r opacity-100" : "w-0 border-r-0 opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <div ref={sidebarContainerRef} className="w-64 flex flex-col h-full flex-shrink-0">
        {/* サイドバーヘッダー */}
        <div className="h-10 border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
              Explorer
            </span>
          </div>

        {/* ツールバーボタン群 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.select();
            }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            title="ファイル名検索 (Ctrl+F)"
            aria-label="ファイル名検索"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {onCreateFile && (
            <button
              onClick={handleStartCreateFile}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="新規ファイル作成"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {onNavigateUp && (
            <button
              onClick={onNavigateUp}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="親ディレクトリへ (..)"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          )}

          {onOpenDirectory && (
            <button
              onClick={handleStartEditPath}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="フォルダパスを指定して開く"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="更新"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="サイドバーを折りたたむ (Ctrl+\)"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* カレントディレクトリ表示 / パス入力バー */}
      <div className="px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/50 text-xs">
        {isEditingPath ? (
          <form onSubmit={handlePathSubmit} className="flex flex-col gap-1.5">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="C:\path\to\folder"
              autoFocus
              className="w-full px-2 py-1 text-xs rounded border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setIsEditingPath(false)}
                className="px-2 py-0.5 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-2 py-0.5 text-[11px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                開く
              </button>
            </div>
          </form>
        ) : (
          <div
            className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 group cursor-pointer"
            onClick={handleStartEditPath}
            title={`${currentDirectory ?? ""}\n(クリックしてフォルダ変更)`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <svg
                className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="font-medium truncate">{dirName}</span>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-opacity">
              変更
            </span>
          </div>
        )}
      </div>

      {/* ファイル名検索（フィルタリング）バー */}
      <div className="px-2.5 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/40">
        <div className="relative flex items-center">
          <span className="absolute left-2 text-zinc-400 dark:text-zinc-500 pointer-events-none flex items-center">
            {isSearching ? (
              <svg className="w-3.5 h-3.5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setSearchQuery("");
              }
            }}
            placeholder="ファイル名を検索..."
            className="w-full pl-7 pr-12 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {searchQuery && (
              <>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 px-1 select-none">
                  {displayTree.totalMatches}件
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                  title="検索をクリア (Esc)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 新規ファイル作成バー */}
      {isCreatingFile && (
        <div className="px-3 py-2 border-b border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs">
          <form onSubmit={handleCreateFileSubmit} className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>新規Markdownファイル作成</span>
              </div>
              {currentDirectory && (
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-5 break-all leading-tight" title={currentDirectory}>
                  保存先: {currentDirectory.split(/[/\\]/).pop() || currentDirectory}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancelCreateFile();
                  }
                }}
                placeholder="ファイル名 (例: note.md)"
                autoFocus
                disabled={isCreating}
                className="w-full px-2 py-1 text-xs rounded border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            {createFileError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 break-words">
                {createFileError}
              </p>
            )}
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={handleCancelCreateFile}
                disabled={isCreating}
                className="px-2 py-0.5 text-[11px] rounded text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isCreating || !newFileName.trim()}
                className="px-2 py-0.5 text-[11px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {isCreating && (
                  <svg className="w-3 h-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                <span>作成</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ファイルツリー / エラー / ローディング */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {isLoading && entries.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
            <svg
              className="w-6 h-6 animate-spin text-indigo-500 mb-2"
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
            <span>ディレクトリを読み込み中...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-md border border-rose-200 dark:border-rose-900/50">
            <p className="font-semibold mb-1">読み込みエラー</p>
            <p className="text-[11px] break-words">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-2 px-2 py-1 bg-white dark:bg-zinc-800 border border-rose-300 dark:border-rose-800 rounded text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
              >
                再試行
              </button>
            )}
          </div>
        ) : displayTree.isFiltering && displayTree.entries.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 px-4 text-center gap-1.5">
            <svg className="w-7 h-7 text-zinc-300 dark:text-zinc-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>「{searchQuery}」に一致するファイルはありません</span>
            <button
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="mt-1 px-2.5 py-1 text-[11px] rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/80 dark:hover:bg-zinc-700 font-medium transition-colors"
            >
              検索条件をクリア
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 px-4 text-center">
            <svg
              className="w-8 h-8 mb-2 stroke-zinc-300 dark:stroke-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span>ファイルがありません</span>
          </div>
        ) : (
          displayTree.entries.map((entry) => (
            <SidebarItem
              key={entry.path}
              entry={entry}
              depth={0}
              isSelected={selectedPath === entry.path}
              isExpanded={displayTree.expandedPaths.has(entry.path)}
              isLoading={loadingPaths?.has(entry.path) ?? false}
              childrenEntries={displayTree.directoryContents[entry.path]}
              expandedPaths={displayTree.expandedPaths}
              loadingPaths={loadingPaths}
              directoryContents={displayTree.directoryContents}
              selectedPath={selectedPath}
              searchQuery={displayTree.isFiltering ? searchQuery : undefined}
              onSelectFile={onSelectFile}
              onToggleDirectory={handleToggleDirectoryItem}
              onDoubleClickDirectory={(entry) => onOpenDirectory?.(entry.path)}
            />
          ))
        )}
      </div>

      {/* フッター */}
      <div className="h-7 border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>
          {displayTree.isFiltering
            ? `${displayTree.totalMatches} 件一致`
            : `${entries.length} 項目`}
        </span>
        {currentDirectory && (
          <span className="truncate max-w-[120px]" title={currentDirectory}>
            {dirName}
          </span>
        )}
      </div>
    </div>
  </aside>
  );
};

export default Sidebar;
