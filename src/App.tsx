import { useEffect, useState, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import TyporiEditor, { EditorRef, SourceEditor } from "./components/Editor";
import Sidebar, { FileEntry } from "./components/Sidebar";
import OutlineSidebar, { OutlineItem } from "./components/OutlineSidebar";
import {
  getCurrentDir,
  getParentDir,
  openFile,
  readDir,
  saveFile,
  createFile,
  getCliArgs,
  saveImageFile,
  isImageFilePath,
} from "./api/fs";
import { useTheme } from "./hooks/useTheme";
import { useTabSettings } from "./hooks/useTabSettings";
import { useShortcutSettings } from "./hooks/useShortcutSettings";
import { normalizeLineEndings, isContentDirty } from "./utils/text";
import ThemeToggle from "./components/ThemeToggle";
import TabBar, { TabItem } from "./components/TabBar";
import { CheatSheetModal } from "./components/CheatSheetModal";
import {
  ShortcutSettingsModal,
  isShortcutEvent,
  formatKeys,
  areKeysEqual,
} from "./components/ShortcutSettingsModal";
import { ExportModal, ExportFormat } from "./components/ExportModal";

function App() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { isTabsEnabled, setIsTabsEnabled } = useTabSettings();
  const { shortcutConfig, saveShortcutConfig } = useShortcutSettings();
  const editorRef = useRef<EditorRef>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalFormat, setExportModalFormat] = useState<ExportFormat>("html");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
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

  const selectedPathRef = useRef<string | null>(selectedPath);
  selectedPathRef.current = selectedPath;

  const tabsRef = useRef<TabItem[]>(tabs);
  tabsRef.current = tabs;

  const activeTabIdRef = useRef<string | null>(activeTabId);
  activeTabIdRef.current = activeTabId;

  const isTabsEnabledRef = useRef<boolean>(isTabsEnabled);
  isTabsEnabledRef.current = isTabsEnabled;

  const currentDirectoryRef = useRef<string | null>(currentDirectory);
  currentDirectoryRef.current = currentDirectory;

  const shortcutConfigRef = useRef(shortcutConfig);
  shortcutConfigRef.current = shortcutConfig;

  const fileContentRef = useRef<string | null>(fileContent);
  fileContentRef.current = fileContent;

  const savedContentRef = useRef<string | null>(savedContent);
  savedContentRef.current = savedContent;

  const isSourceModeRef = useRef<boolean>(isSourceMode);
  isSourceModeRef.current = isSourceMode;

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
        const args = await getCliArgs();
        let targetFilePath: string | null = null;
        let targetDir: string | null = null;

        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg.toLowerCase().endsWith(".md") || arg.toLowerCase().endsWith(".txt") || arg.toLowerCase().endsWith(".markdown")) {
            targetFilePath = arg;
            break;
          }
        }

        if (targetFilePath) {
          targetDir = await getParentDir(targetFilePath);
        }

        const cwd = targetDir || await getCurrentDir();
        if (isMounted) {
          await loadDirectory(cwd, true);

          if (targetFilePath) {
            setSelectedPath(targetFilePath);
            selectedPathRef.current = targetFilePath;
            setIsFileLoading(true);
            try {
              const rawContent = await openFile(targetFilePath);
              const content = normalizeLineEndings(rawContent);
              selectedPathRef.current = targetFilePath;
              fileContentRef.current = content;
              savedContentRef.current = content;
              setFileContent(content);
              setSavedContent(content);
              const fileName =
                targetFilePath.split(/[/\\]/).filter(Boolean).pop() || targetFilePath;
              const initialTab: TabItem = {
                id: targetFilePath,
                path: targetFilePath,
                title: fileName,
                content,
                savedContent: content,
                isDirty: false,
              };
              tabsRef.current = [initialTab];
              activeTabIdRef.current = initialTab.id;
              setTabs([initialTab]);
              setActiveTabId(initialTab.id);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error(`Failed to open initial file '${targetFilePath}':`, err);
              setFileError(`ファイルの読み込みに失敗しました: ${errMsg}`);
            } finally {
              setIsFileLoading(false);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not determine current directory or load file from Tauri:", err);
          setRootError("作業ディレクトリの取得またはファイルの読み込みに失敗しました。フォルダパスを指定してください。");
        }
      }
    };

    initWorkspace();

    return () => {
      isMounted = false;
    };
  }, [loadDirectory]);

  const activeTab = tabs.find(
    (t) => t.id === activeTabId || (selectedPath && t.path === selectedPath)
  );
  const isDirty = isTabsEnabled
    ? Boolean(
        activeTab?.isDirty ||
        (fileContent !== null && savedContent !== null && isContentDirty(fileContent, savedContent)) ||
        (activeTab && activeTab.content !== null && activeTab.savedContent !== null && isContentDirty(activeTab.content, activeTab.savedContent))
      )
    : Boolean(
        selectedPath !== null &&
        fileContent !== null &&
        savedContent !== null &&
        isContentDirty(fileContent, savedContent)
      );


  // ファイル保存
  const handleSave = useCallback(async () => {
    const currentActivePath = selectedPathRef.current;
    if (!currentActivePath || isSaving) return;

    let contentToSave = fileContentRef.current;
    if (!isSourceModeRef.current && editorRef.current) {
      try {
        const md = editorRef.current.getMarkdown();
        if (md !== undefined && md !== null) {
          contentToSave = md;
        }
      } catch (e) {
        // ignore
      }
    }
    if (contentToSave === null) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const normalizedContent = normalizeLineEndings(contentToSave);
      await saveFile(currentActivePath, normalizedContent);

      // 即時Ref同期
      fileContentRef.current = normalizedContent;
      savedContentRef.current = normalizedContent;

      setFileContent(normalizedContent);
      setSavedContent(normalizedContent);
      setTabs((prev) => {
        const nextTabs = prev.map((t) =>
          t.id === activeTabIdRef.current || t.path === currentActivePath
            ? { ...t, content: normalizedContent, savedContent: normalizedContent, isDirty: false }
            : t
        );
        tabsRef.current = nextTabs;
        return nextTabs;
      });
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus(null);
      }, 2500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to save file '${currentActivePath}':`, err);
      setSaveError(`保存に失敗しました: ${errMsg}`);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  // ショートカット (Ctrl+S / Cmd+S で保存, Ctrl+\ / Cmd+\ でサイドバー開閉)
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);
  const handleToggleSidebarRef = useRef(handleToggleSidebar);
  handleToggleSidebarRef.current = handleToggleSidebar;

  const handleToggleRightSidebar = useCallback(() => {
    setIsRightSidebarOpen((prev) => !prev);
  }, []);
  const handleToggleRightSidebarRef = useRef(handleToggleRightSidebar);
  handleToggleRightSidebarRef.current = handleToggleRightSidebar;

  // アウトラインの見出しクリック時に該当位置へスクロール
  const handleSelectHeading = useCallback(
    (item: OutlineItem) => {
      if (!isSourceMode) {
        // 1. WYSIWYGモード: .ProseMirror 内の h1-h6 要素を検索
        const editorElement = document.querySelector(".ProseMirror");
        if (editorElement) {
          const headings = editorElement.querySelectorAll("h1, h2, h3, h4, h5, h6");
          for (const heading of headings) {
            if (heading.textContent?.trim() === item.text) {
              heading.scrollIntoView({ behavior: "smooth", block: "center" });
              heading.classList.add("outline-target-highlight");
              setTimeout(() => {
                heading.classList.remove("outline-target-highlight");
              }, 1400);
              return;
            }
          }
        }
      } else {
        // 2. ソースコード直接編集モード (CodeMirror 6)
        const cmContent = document.querySelector(".cm-content");
        if (cmContent) {
          const lines = cmContent.querySelectorAll(".cm-line");
          if (lines[item.line]) {
            lines[item.line].scrollIntoView({ behavior: "smooth", block: "center" });
            lines[item.line].classList.add("outline-target-highlight");
            setTimeout(() => {
              lines[item.line]?.classList.remove("outline-target-highlight");
            }, 1400);
            return;
          }
          for (const line of lines) {
            if (line.textContent?.includes(item.text)) {
              line.scrollIntoView({ behavior: "smooth", block: "center" });
              line.classList.add("outline-target-highlight");
              setTimeout(() => {
                line.classList.remove("outline-target-highlight");
              }, 1400);
              return;
            }
          }
        }
      }
    },
    [isSourceMode]
  );
  const handleSelectHeadingRef = useRef(handleSelectHeading);
  handleSelectHeadingRef.current = handleSelectHeading;


  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);
  const handleToggleFocusModeRef = useRef(handleToggleFocusMode);
  handleToggleFocusModeRef.current = handleToggleFocusMode;

  const handleToggleSourceMode = useCallback(() => {
    setIsSourceMode((prev) => {
      const next = !prev;
      isSourceModeRef.current = next;
      if (!prev && editorRef.current) {
        try {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) {
            const normalized = normalizeLineEndings(md);
            fileContentRef.current = normalized;
            setFileContent(normalized);
          }
        } catch (e) {
          console.warn("Could not get markdown from editorRef:", e);
        }
      }
      return next;
    });
  }, []);
  const handleToggleSourceModeRef = useRef(handleToggleSourceMode);
  handleToggleSourceModeRef.current = handleToggleSourceMode;

  // タブ機能の有効/無効切り替え
  const handleToggleTabsEnabled = useCallback(() => {
    let currentContent = fileContentRef.current;
    if (!isSourceModeRef.current && editorRef.current) {
      try {
        const md = editorRef.current.getMarkdown();
        if (md !== undefined && md !== null) {
          currentContent = md;
        }
      } catch (e) {
        // ignore
      }
    }
    if (currentContent !== null) {
      currentContent = normalizeLineEndings(currentContent);
      fileContentRef.current = currentContent;
    }

    if (isTabsEnabledRef.current) {
      // 有効 -> 無効への切り替え時
      const currentActiveId = activeTabIdRef.current;
      const currentTabs = tabsRef.current;

      const syncedTabs = currentTabs.map((t) => {
        if (t.id === currentActiveId && currentContent !== null) {
          return {
            ...t,
            content: currentContent,
            isDirty: isContentDirty(currentContent, t.savedContent),
          };
        }
        return t;
      });

      // アクティブ以外のタブに未保存の変更があるかチェック
      const otherDirtyTabs = syncedTabs.filter(
        (t) => t.id !== currentActiveId && (t.isDirty ?? isContentDirty(t.content, t.savedContent))
      );

      if (otherDirtyTabs.length > 0) {
        const fileNames = otherDirtyTabs.map((t) => `「${t.title}」`).join("、");
        const ok = window.confirm(
          `未保存のタブ（${fileNames}）があります。\nタブ機能を無効にすると現在表示中のファイル以外は閉じられますが、無効にしますか？`
        );
        if (!ok) return;
      }

      const activeTab = syncedTabs.find((t) => t.id === currentActiveId);
      const nextTabs = activeTab ? [activeTab] : [];
      tabsRef.current = nextTabs;
      isTabsEnabledRef.current = false;
      setTabs(nextTabs);
      setIsTabsEnabled(false);
    } else {
      // 無効 -> 有効への切り替え時
      if (selectedPathRef.current && currentContent !== null) {
        const curPath = selectedPathRef.current;
        const curFileName =
          curPath.split(/[/\\]/).filter(Boolean).pop() || curPath;
        const normSaved = normalizeLineEndings(savedContentRef.current ?? currentContent);
        const currentTab: TabItem = {
          id: curPath,
          path: curPath,
          title: curFileName,
          content: currentContent,
          savedContent: normSaved,
          isDirty: isContentDirty(currentContent, normSaved),
        };
        tabsRef.current = [currentTab];
        activeTabIdRef.current = currentTab.id;
        isTabsEnabledRef.current = true;
        setTabs([currentTab]);
        setActiveTabId(currentTab.id);
      } else {
        isTabsEnabledRef.current = true;
      }
      setIsTabsEnabled(true);
    }
  }, [setIsTabsEnabled]);
  const handleToggleTabsEnabledRef = useRef(handleToggleTabsEnabled);
  handleToggleTabsEnabledRef.current = handleToggleTabsEnabled;

  // コンテンツ更新時にアクティブタブの content も同期
  // ユーザー能動操作前（meta.isUserInteraction === false）の場合は、
  // クリーンな状態（未保存変更なし）のファイルに限り Milkdown 初回シリアライズ結果をベースラインとして同期し未保存（Dirty）判定の誤爆を抑止。
  // 一方、対象タブに既に未保存変更が存在する場合は savedContent の上書きおよび isDirty リセットを防止（保護）。
  const handleContentChange = useCallback(
    (markdown: string, meta?: { isUserInteraction?: boolean }) => {
      const normalized = normalizeLineEndings(markdown);
      fileContentRef.current = normalized;
      setFileContent(normalized);

      const currentActiveId = activeTabIdRef.current;
      const currentSelectedPath = selectedPathRef.current;
      const currentTabs = tabsRef.current;
      const activeTab = currentTabs.find(
        (t) => t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
      );

      // 対象タブが既に未保存変更を持っているかどうかの判定
      const hasUnsavedChanges = activeTab
        ? Boolean(
            activeTab.isDirty ||
            (activeTab.savedContent !== null &&
             activeTab.savedContent !== undefined &&
             isContentDirty(activeTab.content, activeTab.savedContent))
          )
        : Boolean(
            fileContentRef.current !== null &&
            savedContentRef.current !== null &&
            isContentDirty(fileContentRef.current, savedContentRef.current) &&
            editorRef.current?.hasUserInteracted?.()
          );

      if (meta && meta.isUserInteraction === false) {
        // 未保存変更が存在するタブの場合、savedContent の上書きおよび isDirty リセットを抑止し保護
        if (hasUnsavedChanges) {
          const preservedSavedContent = activeTab?.savedContent ?? savedContentRef.current ?? normalized;
          savedContentRef.current = preservedSavedContent;
          setSavedContent(preservedSavedContent);
          setTabs((prev) => {
            const nextTabs = prev.map((t) =>
              t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
                ? {
                    ...t,
                    content: normalized,
                    savedContent: t.savedContent ?? preservedSavedContent,
                    isDirty: true,
                  }
                : t
            );
            tabsRef.current = nextTabs;
            return nextTabs;
          });
          return;
        }

        // クリーンな状態のタブの場合のみ、初回シリアライズ差異をベースラインとして同期
        savedContentRef.current = normalized;
        setSavedContent(normalized);
        setTabs((prev) => {
          const nextTabs = prev.map((t) =>
            t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
              ? { ...t, content: normalized, savedContent: normalized, isDirty: false }
              : t
          );
          tabsRef.current = nextTabs;
          return nextTabs;
        });
        return;
      }

      setTabs((prev) => {
        const nextTabs = prev.map((t) =>
          t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
            ? { ...t, content: normalized, isDirty: isContentDirty(normalized, t.savedContent) }
            : t
        );
        tabsRef.current = nextTabs;
        return nextTabs;
      });
    },
    []
  );

  // タブ選択（切り替え）
  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabIdRef.current) return;

      // 現在のエディタの変更内容を取得し、切り替え前のタブに保存
      let currentContent = fileContentRef.current;
      if (!isSourceModeRef.current && editorRef.current) {
        try {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) {
            currentContent = md;
          }
        } catch (e) {
          console.warn("Could not get markdown from editorRef before tab switch:", e);
        }
      }

      const currentActiveId = activeTabIdRef.current;
      const updatedTabs = tabsRef.current.map((t) => {
        if (t.id === currentActiveId && currentContent !== null) {
          const normContent = normalizeLineEndings(currentContent);
          return {
            ...t,
            content: normContent,
            isDirty: isContentDirty(normContent, t.savedContent),
          };
        }
        return t;
      });

      const targetTab = updatedTabs.find((t) => t.id === tabId);
      if (!targetTab) return;

      const normTargetContent = normalizeLineEndings(targetTab.content);
      const normTargetSavedContent = normalizeLineEndings(targetTab.savedContent ?? targetTab.content);
      const targetIsDirty = Boolean(
        targetTab.isDirty || isContentDirty(normTargetContent, normTargetSavedContent)
      );

      const syncedTabs = updatedTabs.map((t) =>
        t.id === tabId
          ? { ...t, content: normTargetContent, savedContent: normTargetSavedContent, isDirty: targetIsDirty }
          : t
      );

      // 即時Ref同期（切り替え後のタブ状態と完全同期）
      tabsRef.current = syncedTabs;
      activeTabIdRef.current = tabId;
      selectedPathRef.current = targetTab.path;
      fileContentRef.current = normTargetContent;
      savedContentRef.current = normTargetSavedContent;

      setTabs(syncedTabs);
      setActiveTabId(tabId);
      setSelectedPath(targetTab.path);
      setFileContent(normTargetContent);
      setSavedContent(normTargetSavedContent);
      setSaveStatus(null);
      setSaveError(null);
      setFileError(null);
    },
    []
  );
  const handleSelectTabRef = useRef(handleSelectTab);
  handleSelectTabRef.current = handleSelectTab;

  // タブを閉じる
  const handleCloseTab = useCallback(
    (tabId: string) => {
      const currentActiveId = activeTabIdRef.current;
      let currentContent = fileContentRef.current;
      if (tabId === currentActiveId && !isSourceModeRef.current && editorRef.current) {
        try {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) {
            currentContent = md;
          }
        } catch (e) {
          // ignore
        }
      }
      if (currentContent !== null) {
        currentContent = normalizeLineEndings(currentContent);
        fileContentRef.current = currentContent;
      }

      const currentTabs = tabsRef.current;
      const targetTab = currentTabs.find((t) => t.id === tabId);
      if (!targetTab) return;

      const targetIsDirty =
        tabId === currentActiveId && currentContent !== null
          ? Boolean(
              targetTab.isDirty ||
              isContentDirty(currentContent, targetTab.savedContent) ||
              isContentDirty(targetTab.content, targetTab.savedContent)
            )
          : Boolean(
              targetTab.isDirty ||
              isContentDirty(targetTab.content, targetTab.savedContent)
            );

      if (targetIsDirty) {
        const ok = window.confirm(
          `「${targetTab.title}」には保存されていない変更があります。保存せずに閉じますか？`
        );
        if (!ok) return;
      }

      const targetIndex = currentTabs.findIndex((t) => t.id === tabId);
      const newTabs = currentTabs.filter((t) => t.id !== tabId);

      if (tabId === currentActiveId) {
        if (newTabs.length > 0) {
          const nextIndex = Math.min(targetIndex, newTabs.length - 1);
          const nextTab = newTabs[nextIndex];
          const normNextContent = normalizeLineEndings(nextTab.content);
          const normNextSavedContent = normalizeLineEndings(nextTab.savedContent ?? nextTab.content);
          const nextIsDirty = Boolean(
            nextTab.isDirty || isContentDirty(normNextContent, normNextSavedContent)
          );

          const syncedNewTabs = newTabs.map((t, idx) =>
            idx === nextIndex
              ? { ...t, content: normNextContent, savedContent: normNextSavedContent, isDirty: nextIsDirty }
              : t
          );

          // 即時Ref同期
          tabsRef.current = syncedNewTabs;
          activeTabIdRef.current = nextTab.id;
          selectedPathRef.current = nextTab.path;
          fileContentRef.current = normNextContent;
          savedContentRef.current = normNextSavedContent;

          setTabs(syncedNewTabs);
          setActiveTabId(nextTab.id);
          setSelectedPath(nextTab.path);
          setFileContent(normNextContent);
          setSavedContent(normNextSavedContent);
          setSaveStatus(null);
          setSaveError(null);
          setFileError(null);
        } else {
          // 即時Ref同期
          tabsRef.current = [];
          activeTabIdRef.current = null;
          selectedPathRef.current = null;
          fileContentRef.current = null;
          savedContentRef.current = null;

          setTabs([]);
          setActiveTabId(null);
          setSelectedPath(null);
          setFileContent(null);
          setSavedContent(null);
          setSaveStatus(null);
          setSaveError(null);
          setFileError(null);
        }
      } else {
        tabsRef.current = newTabs;
        setTabs(newTabs);
      }
    },
    []
  );
  const handleCloseTabRef = useRef(handleCloseTab);
  handleCloseTabRef.current = handleCloseTab;

  const handleToggleCheatSheet = useCallback(() => {
    setIsCheatSheetOpen((prev) => !prev);
  }, []);
  const handleToggleCheatSheetRef = useRef(handleToggleCheatSheet);
  handleToggleCheatSheetRef.current = handleToggleCheatSheet;

  const handleToggleShortcutSettings = useCallback(() => {
    setIsShortcutSettingsOpen((prev) => !prev);
  }, []);
  const handleToggleShortcutSettingsRef = useRef(handleToggleShortcutSettings);
  handleToggleShortcutSettingsRef.current = handleToggleShortcutSettings;

  const handleOpenExportModal = useCallback((format: ExportFormat = "html") => {
    setExportModalFormat(format);
    setIsExportModalOpen(true);
  }, []);
  const handleCloseExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);
  const handleOpenExportModalRef = useRef(handleOpenExportModal);
  handleOpenExportModalRef.current = handleOpenExportModal;

  const getCurrentMarkdown = useCallback((): string => {
    if (!isSourceMode && editorRef.current) {
      try {
        const md = editorRef.current.getMarkdown();
        if (md !== undefined && md !== null) {
          return md;
        }
      } catch (e) {
        console.warn("Could not get markdown from editorRef:", e);
      }
    }
    return fileContent ?? "";
  }, [fileContent, isSourceMode]);

  const handleMenuNewFileRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const config = shortcutConfigRef.current;

      // HTMLエクスポート (デフォルト: Ctrl+Shift+E)
      if (
        isShortcutEvent(e, config.export_html || ["Ctrl", "Shift", "E"]) ||
        (areKeysEqual(config.export_html || ["Ctrl", "Shift", "E"], ["Ctrl", "Shift", "E"]) &&
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "e")
      ) {
        e.preventDefault();
        handleOpenExportModalRef.current("html");
        return;
      }

      // PDFエクスポート (デフォルト: Ctrl+Shift+P または Ctrl+P)
      if (
        isShortcutEvent(e, config.export_pdf || ["Ctrl", "Shift", "P"]) ||
        (areKeysEqual(config.export_pdf || ["Ctrl", "Shift", "P"], ["Ctrl", "Shift", "P"]) &&
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "p") ||
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p")
      ) {
        e.preventDefault();
        handleOpenExportModalRef.current("pdf");
        return;
      }

      // ショートカット設定画面 (デフォルト: Ctrl+,)
      if (
        isShortcutEvent(e, config.open_shortcuts_settings) ||
        (areKeysEqual(config.open_shortcuts_settings, ["Ctrl", ","]) &&
          (e.ctrlKey || e.metaKey) &&
          e.key === ",")
      ) {
        e.preventDefault();
        handleToggleShortcutSettingsRef.current();
        return;
      }
      // チートシート表示切替 (デフォルト: F1 または Ctrl+Shift+?)
      if (
        isShortcutEvent(e, config.open_cheatsheet) ||
        (areKeysEqual(config.open_cheatsheet, ["F1"]) &&
          (e.key === "F1" ||
            ((e.ctrlKey || e.metaKey) &&
              e.shiftKey &&
              (e.key === "?" || e.code === "Slash"))))
      ) {
        e.preventDefault();
        handleToggleCheatSheetRef.current();
        return;
      }
      // タブを閉じる (デフォルト: Ctrl+W)
      if (isShortcutEvent(e, config.close_tab)) {
        if (activeTabIdRef.current) {
          e.preventDefault();
          handleCloseTabRef.current(activeTabIdRef.current);
          return;
        }
      }
      // タブ機能の有効/無効切替 (デフォルト: Ctrl+Shift+T)
      if (isShortcutEvent(e, config.toggle_tabs)) {
        e.preventDefault();
        handleToggleTabsEnabledRef.current();
        return;
      }
      // フォーカスモード切替 (デフォルト: F8)
      if (
        isShortcutEvent(e, config.toggle_focus_mode) ||
        (areKeysEqual(config.toggle_focus_mode, ["F8"]) && e.key === "F8")
      ) {
        e.preventDefault();
        handleToggleFocusModeRef.current();
        return;
      }
      // 新規作成 (デフォルト: Ctrl+N)
      if (isShortcutEvent(e, config.new_file)) {
        e.preventDefault();
        handleMenuNewFileRef.current();
        return;
      }
      // 保存 (デフォルト: Ctrl+S)
      if (isShortcutEvent(e, config.save_file)) {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }
      // 左サイドバートグル (デフォルト: Ctrl+\)
      if (isShortcutEvent(e, config.toggle_sidebar)) {
        e.preventDefault();
        handleToggleSidebarRef.current();
        return;
      }
      // 右サイドバー（アウトライン）トグル (デフォルト: Ctrl+Shift+O)
      if (isShortcutEvent(e, config.toggle_right_sidebar)) {
        e.preventDefault();
        handleToggleRightSidebarRef.current();
        return;
      }
      // ソースコード直接編集モード切替 (デフォルト: Ctrl+/)
      const isSlashKey =
        e.key === "/" ||
        (e.code === "Slash" && !e.shiftKey) ||
        e.code === "NumpadDivide";
      if (
        isShortcutEvent(e, config.toggle_source_mode) ||
        (areKeysEqual(config.toggle_source_mode, ["Ctrl", "/"]) &&
          (e.ctrlKey || e.metaKey) &&
          isSlashKey &&
          !e.altKey)
      ) {
        e.preventDefault();
        handleToggleSourceModeRef.current();
        return;
      }
      // Undo / Redo / Link / Blockquote フォールバック（エディタ外にフォーカスがある場合）
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (!isInput) {
        // Undo: デフォルト Ctrl+Z
        if (isShortcutEvent(e, config.undo)) {
          e.preventDefault();
          editorRef.current?.undo();
          return;
        }
        // Redo: デフォルト Ctrl+Y または Ctrl+Shift+Z
        if (
          isShortcutEvent(e, config.redo) ||
          (areKeysEqual(config.redo, ["Ctrl", "Y"]) &&
            (e.ctrlKey || e.metaKey) &&
            (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z")))
        ) {
          e.preventDefault();
          editorRef.current?.redo();
          return;
        }
        // リンク挿入/編集: デフォルト Ctrl+K
        if (isShortcutEvent(e, config.insert_link)) {
          e.preventDefault();
          editorRef.current?.openLinkModal();
          return;
        }
        // 引用トグル: デフォルト Ctrl+Shift+Q
        if (isShortcutEvent(e, config.toggle_blockquote)) {
          e.preventDefault();
          editorRef.current?.toggleBlockquote();
          return;
        }
        // 表（テーブル）挿入: デフォルト Ctrl+Alt+T
        if (isShortcutEvent(e, config.insert_table)) {
          e.preventDefault();
          editorRef.current?.insertTable(3, 3);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 未保存ファイルの検出関数
  const getUnsavedDocuments = useCallback((): { hasUnsaved: boolean; fileNames: string[] } => {
    let currentContent = fileContentRef.current;
    if (!isSourceModeRef.current && editorRef.current) {
      try {
        // ユーザーが一度も能動的に編集操作を行っていない場合、
        // Milkdownの初期シリアライズ差異による未保存誤爆を抑止
        if (
          typeof editorRef.current.hasUserInteracted === "function" &&
          !editorRef.current.hasUserInteracted()
        ) {
          // ユーザー未操作のためエディタシリアライズによる上書きをスキップ
        } else {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) {
            currentContent = md;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (currentContent !== null) {
      currentContent = normalizeLineEndings(currentContent);
    }

    const unsavedFileNames: string[] = [];

    if (isTabsEnabledRef.current) {
      const currentTabs = tabsRef.current;
      const currentActiveId = activeTabIdRef.current;
      for (const tab of currentTabs) {
        const tabContent =
          tab.id === currentActiveId && currentContent !== null
            ? currentContent
            : normalizeLineEndings(tab.content);
        const isTabDirty =
          tab.id === currentActiveId && currentContent !== null
            ? Boolean(
                tab.isDirty ||
                isContentDirty(currentContent, tab.savedContent) ||
                isContentDirty(tab.content, tab.savedContent)
              )
            : Boolean(
                tab.isDirty ||
                isContentDirty(tabContent, tab.savedContent)
              );
        if (isTabDirty) {
          unsavedFileNames.push(tab.title);
        }
      }
    } else {
      const isCurDirty = Boolean(
        selectedPathRef.current !== null &&
        currentContent !== null &&
        savedContentRef.current !== null &&
        isContentDirty(currentContent, savedContentRef.current)
      );
      if (isCurDirty) {
        const curFileName =
          selectedPathRef.current?.split(/[/\\]/).filter(Boolean).pop() || "現在のファイル";
        unsavedFileNames.push(curFileName);
      }
    }

    return {
      hasUnsaved: unsavedFileNames.length > 0,
      fileNames: unsavedFileNames,
    };
  }, []);

  // 未保存時のウィンドウクローズ (CloseRequested) および離脱防止
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const unsaved = getUnsavedDocuments();
      if (unsaved.hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    let unlistenClose: (() => void) | undefined;
    let unlistenNativeClose: (() => void) | undefined;
    let isCancelled = false;
    let isHandlingClose = false;

    const executeCloseWorkflow = async (appWindow: ReturnType<typeof getCurrentWindow>) => {
      if (isHandlingClose) return;
      isHandlingClose = true;
      try {
        const unsaved = getUnsavedDocuments();
        if (unsaved.hasUnsaved) {
          // 未保存変更がある場合は確認ダイアログを表示
          const namesList = unsaved.fileNames.map((name) => `「${name}」`).join("、");
          const ok = window.confirm(
            `保存されていない変更があります（${namesList}）。\n保存せずに Typori を終了しますか？`
          );

          if (ok) {
            try {
              await appWindow.destroy();
            } catch (destroyErr) {
              console.error("Failed to destroy window on exit:", destroyErr);
            }
          }
        } else {
          // 未保存変更がない場合は即座に終了
          try {
            await appWindow.destroy();
          } catch (destroyErr) {
            console.error("Failed to destroy window on exit:", destroyErr);
          }
        }
      } finally {
        isHandlingClose = false;
      }
    };

    (async () => {
      try {
        const appWindow = getCurrentWindow();
        if (!appWindow) return;

        // 1. Rust バックエンドからの CloseRequested 通知ハンドシェイク ("window:close_requested")
        const unlistenEmit = await listen("window:close_requested", async () => {
          await executeCloseWorkflow(appWindow);
        });

        // 2. フロントエンド直接の onCloseRequested リスナー（フォールバック）
        let unlistenOnClose: (() => void) | undefined;
        if (typeof appWindow.onCloseRequested === "function") {
          unlistenOnClose = await appWindow.onCloseRequested(async (event) => {
            event.preventDefault();
            await executeCloseWorkflow(appWindow);
          });
        }

        if (isCancelled) {
          unlistenEmit();
          if (unlistenOnClose) unlistenOnClose();
        } else {
          unlistenNativeClose = unlistenEmit;
          unlistenClose = unlistenOnClose;
        }
      } catch (err) {
        console.warn("Tauri close requested listener registration skipped:", err);
      }
    })();

    return () => {
      isCancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (unlistenClose) {
        unlistenClose();
      }
      if (unlistenNativeClose) {
        unlistenNativeClose();
      }
    };
  }, [getUnsavedDocuments]);

  // ファイル選択時
  const handleSelectFile = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) return;

    // 現在のエディタの最新内容を取得
    let currentContent = fileContentRef.current;
    if (!isSourceModeRef.current && editorRef.current) {
      try {
        if (
          typeof editorRef.current.hasUserInteracted === "function" &&
          !editorRef.current.hasUserInteracted()
        ) {
          // ユーザー未操作時は初期シリアライズ差分を無視
        } else {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) {
            currentContent = md;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    if (currentContent !== null) {
      currentContent = normalizeLineEndings(currentContent);
      fileContentRef.current = currentContent;
    }

    // タブ機能が無効（単一ファイルモード）の場合
    if (!isTabsEnabledRef.current) {
      if (selectedPathRef.current === entry.path) {
        return;
      }

      const isCurrentDirty = Boolean(
        selectedPathRef.current !== null &&
        currentContent !== null &&
        savedContentRef.current !== null &&
        isContentDirty(currentContent, savedContentRef.current)
      );

      if (isCurrentDirty) {
        const curFileName =
          selectedPathRef.current?.split(/[/\\]/).filter(Boolean).pop() || "現在のファイル";
        const ok = window.confirm(
          `「${curFileName}」には保存されていない変更があります。保存せずに別のファイルを開きますか？`
        );
        if (!ok) return;
      }

      // 未保存破棄承認時: 前のファイルの未保存ステータス・バッファを先行破棄してクリーン初期化
      selectedPathRef.current = entry.path;
      setSelectedPath(entry.path);
      fileContentRef.current = null;
      savedContentRef.current = null;
      setFileContent(null);
      setSavedContent(null);
      tabsRef.current = [];
      setTabs([]);
      activeTabIdRef.current = null;
      setActiveTabId(null);
      setIsFileLoading(true);
      setFileError(null);
      setSaveError(null);
      setSaveStatus(null);

      try {
        const rawContent = await openFile(entry.path);
        const content = normalizeLineEndings(rawContent);
        const fileName =
          entry.name || entry.path.split(/[/\\]/).filter(Boolean).pop() || entry.path;
        const newTab: TabItem = {
          id: entry.path,
          path: entry.path,
          title: fileName,
          content,
          savedContent: content,
          isDirty: false,
        };

        // 即時Ref同期（単一ファイルモード: 未保存ステータス完全破棄 & クリーン同期）
        tabsRef.current = [newTab];
        activeTabIdRef.current = newTab.id;
        selectedPathRef.current = entry.path;
        fileContentRef.current = content;
        savedContentRef.current = content;

        setTabs([newTab]);
        setActiveTabId(newTab.id);
        setSelectedPath(entry.path);
        setFileContent(content);
        setSavedContent(content);
        setSaveStatus(null);
        setSaveError(null);
        setFileError(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to open file '${entry.path}':`, err);
        setFileError(`ファイルの読み込みに失敗しました: ${errMsg}`);
        fileContentRef.current = null;
        savedContentRef.current = null;
        tabsRef.current = [];
        setTabs([]);
        setFileContent(null);
        setSavedContent(null);
      } finally {
        setIsFileLoading(false);
      }
      return;
    }

    // タブ機能が有効の場合: 既に開かれているタブがあればそれに切り替え
    const existingTab = tabsRef.current.find(
      (t) => t.path === entry.path || t.id === entry.path
    );
    if (existingTab) {
      handleSelectTabRef.current(existingTab.id);
      return;
    }

    const currentActiveId = activeTabIdRef.current;
    const updatedTabs = tabsRef.current.map((t) => {
      if (t.id === currentActiveId && currentContent !== null) {
        return {
          ...t,
          content: currentContent,
          isDirty: isContentDirty(currentContent, t.savedContent),
        };
      }
      return t;
    });
    tabsRef.current = updatedTabs;
    setTabs(updatedTabs);

    selectedPathRef.current = entry.path;
    setSelectedPath(entry.path);
    setIsFileLoading(true);
    setFileError(null);
    setSaveError(null);
    setSaveStatus(null);

    try {
      const rawContent = await openFile(entry.path);
      const content = normalizeLineEndings(rawContent);
      const fileName =
        entry.name || entry.path.split(/[/\\]/).filter(Boolean).pop() || entry.path;
      const newTab: TabItem = {
        id: entry.path,
        path: entry.path,
        title: fileName,
        content,
        savedContent: content,
        isDirty: false,
      };

      const newTabs = [...updatedTabs, newTab];

      // 即時Ref同期（複数タブモード）
      tabsRef.current = newTabs;
      activeTabIdRef.current = newTab.id;
      selectedPathRef.current = entry.path;
      fileContentRef.current = content;
      savedContentRef.current = content;

      setTabs(newTabs);
      setActiveTabId(newTab.id);
      setFileContent(content);
      setSavedContent(content);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to open file '${entry.path}':`, err);
      setFileError(`ファイルの読み込みに失敗しました: ${errMsg}`);
    } finally {
      setIsFileLoading(false);
    }
  }, []);

  const handleSelectFileRef = useRef(handleSelectFile);
  handleSelectFileRef.current = handleSelectFile;

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

    const separator = currentDirectory.includes("\\") ? "\\" : "/";
    const fullPath =
      currentDirectory.endsWith("/") || currentDirectory.endsWith("\\")
        ? `${currentDirectory}${fileName}`
        : `${currentDirectory}${separator}${fileName}`;

    const title = fileName.replace(/\.[^/.]+$/, "");
    const initialContent = `# ${title}\n\n`;

    // タブ機能が無効（単一ファイルモード）の場合
    if (!isTabsEnabledRef.current) {
      let currentContent = fileContentRef.current;
      if (!isSourceModeRef.current && editorRef.current) {
        try {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) currentContent = md;
        } catch (e) {
          // ignore
        }
      }
      if (currentContent !== null) {
        currentContent = normalizeLineEndings(currentContent);
        fileContentRef.current = currentContent;
      }
      const isCurrentDirty = Boolean(
        selectedPathRef.current !== null &&
        currentContent !== null &&
        savedContentRef.current !== null &&
        isContentDirty(currentContent, savedContentRef.current)
      );

      if (isCurrentDirty) {
        const curFileName =
          selectedPathRef.current?.split(/[/\\]/).filter(Boolean).pop() || "現在のファイル";
        const ok = window.confirm(
          `「${curFileName}」には保存されていない変更があります。保存せずに新規ファイルを作成しますか？`
        );
        if (!ok) return false;
      }

      setSaveStatus(null);
      setSaveError(null);
      setFileError(null);

      try {
        const newEntry = await createFile(fullPath, initialContent);
        await loadDirectory(currentDirectory, true);

        const newTabName =
          newEntry.name || newEntry.path.split(/[/\\]/).filter(Boolean).pop() || fileName;
        const normalizedInitial = normalizeLineEndings(initialContent);
        const newTab: TabItem = {
          id: newEntry.path,
          path: newEntry.path,
          title: newTabName,
          content: normalizedInitial,
          savedContent: normalizedInitial,
          isDirty: false,
        };

        // 即時Ref同期（単一ファイルモード）
        tabsRef.current = [newTab];
        activeTabIdRef.current = newTab.id;
        selectedPathRef.current = newEntry.path;
        fileContentRef.current = normalizedInitial;
        savedContentRef.current = normalizedInitial;

        setTabs([newTab]);
        setActiveTabId(newTab.id);
        setSelectedPath(newEntry.path);
        setFileContent(normalizedInitial);
        setSavedContent(normalizedInitial);
        setSaveStatus(null);
        setSaveError(null);
        setFileError(null);
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to create file '${fullPath}':`, err);
        throw new Error(`新規ファイルの作成に失敗しました: ${errMsg}`);
      }
    }

    try {
      // 現在のアクティブタブの内容を同期
      let currentContent = fileContentRef.current;
      if (!isSourceModeRef.current && editorRef.current) {
        try {
          const md = editorRef.current.getMarkdown();
          if (md !== undefined && md !== null) currentContent = md;
        } catch (e) {
          // ignore
        }
      }
      if (currentContent !== null) {
        currentContent = normalizeLineEndings(currentContent);
        fileContentRef.current = currentContent;
      }
      const currentActiveId = activeTabIdRef.current;
      const updatedTabs = tabsRef.current.map((t) => {
        if (t.id === currentActiveId && currentContent !== null) {
          return {
            ...t,
            content: currentContent,
            isDirty: isContentDirty(currentContent, t.savedContent),
          };
        }
        return t;
      });
      tabsRef.current = updatedTabs;

      const newEntry = await createFile(fullPath, initialContent);
      await loadDirectory(currentDirectory, true);

      const newTabName =
        newEntry.name || newEntry.path.split(/[/\\]/).filter(Boolean).pop() || fileName;
      const normalizedInitial = normalizeLineEndings(initialContent);
      const newTab: TabItem = {
        id: newEntry.path,
        path: newEntry.path,
        title: newTabName,
        content: normalizedInitial,
        savedContent: normalizedInitial,
        isDirty: false,
      };

      const newTabs = [...updatedTabs, newTab];

      // 即時Ref同期（複数タブモード）
      tabsRef.current = newTabs;
      activeTabIdRef.current = newTab.id;
      selectedPathRef.current = newEntry.path;
      fileContentRef.current = normalizedInitial;
      savedContentRef.current = normalizedInitial;

      setTabs(newTabs);
      setActiveTabId(newTab.id);
      setSelectedPath(newEntry.path);
      setFileContent(normalizedInitial);
      setSavedContent(normalizedInitial);
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

  // メニューまたはショートカットからの新規ファイル作成
  const handleMenuNewFile = useCallback(async () => {
    if (!currentDirectory) {
      alert("ファイルを作成するフォルダが読み込まれていません。");
      return;
    }
    const fileName = window.prompt("新しいファイル名を入力してください (例: memo.md):", "Untitled.md");
    if (!fileName || !fileName.trim()) return;
    try {
      await handleCreateFile(fileName.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }, [currentDirectory, handleCreateFile]);

  handleMenuNewFileRef.current = handleMenuNewFile;

  // Tauri OSネイティブメニューイベントの受信
  useEffect(() => {
    let isMounted = true;
    const unlistens: (() => void)[] = [];

    const setupMenuListeners = async () => {
      try {
        const uSave = await listen("menu:save_file", () => {
          handleSaveRef.current();
        });
        if (isMounted) unlistens.push(uSave);
        else uSave();

        const uExport = await listen("menu:export_html", () => {
          handleOpenExportModalRef.current("html");
        });
        if (isMounted) unlistens.push(uExport);
        else uExport();

        const uExportPdf = await listen("menu:export_pdf", () => {
          handleOpenExportModalRef.current("pdf");
        });
        if (isMounted) unlistens.push(uExportPdf);
        else uExportPdf();

        const uNew = await listen("menu:new_file", () => {
          handleMenuNewFileRef.current();
        });
        if (isMounted) unlistens.push(uNew);
        else uNew();

        const uToggle = await listen("menu:toggle_sidebar", () => {
          handleToggleSidebarRef.current();
        });
        if (isMounted) unlistens.push(uToggle);
        else uToggle();

        const uToggleRight = await listen("menu:toggle_right_sidebar", () => {
          handleToggleRightSidebarRef.current();
        });
        if (isMounted) unlistens.push(uToggleRight);
        else uToggleRight();


        const uUndo = await listen("menu:undo", () => {
          editorRef.current?.undo();
        });
        if (isMounted) unlistens.push(uUndo);
        else uUndo();

        const uRedo = await listen("menu:redo", () => {
          editorRef.current?.redo();
        });
        if (isMounted) unlistens.push(uRedo);
        else uRedo();

        const uLink = await listen("menu:insert_link", () => {
          editorRef.current?.openLinkModal();
        });
        if (isMounted) unlistens.push(uLink);
        else uLink();

        const uQuote = await listen("menu:toggle_blockquote", () => {
          editorRef.current?.toggleBlockquote();
        });
        if (isMounted) unlistens.push(uQuote);
        else uQuote();

        const uTable = await listen("menu:insert_table", () => {
          editorRef.current?.insertTable(3, 3);
        });
        if (isMounted) unlistens.push(uTable);
        else uTable();

        const uToggleSource = await listen("menu:toggle_source_mode", () => {
          handleToggleSourceModeRef.current();
        });
        if (isMounted) unlistens.push(uToggleSource);
        else uToggleSource();

        const uToggleFocus = await listen("menu:toggle_focus_mode", () => {
          handleToggleFocusModeRef.current();
        });
        if (isMounted) unlistens.push(uToggleFocus);
        else uToggleFocus();

        const uToggleTabs = await listen("menu:toggle_tabs", () => {
          handleToggleTabsEnabledRef.current();
        });
        if (isMounted) unlistens.push(uToggleTabs);
        else uToggleTabs();

        const uCheatSheet = await listen("menu:open_cheatsheet", () => {
          setIsCheatSheetOpen(true);
        });
        if (isMounted) unlistens.push(uCheatSheet);
        else uCheatSheet();

        const uShortcutSettings = await listen("menu:open_shortcuts_settings", () => {
          setIsShortcutSettingsOpen(true);
        });
        if (isMounted) unlistens.push(uShortcutSettings);
        else uShortcutSettings();

        const uFileDrop = await listen("tauri://drag-drop", async (e) => {
          const payload = e.payload as any;
          const paths: string[] = payload.paths || [];
          if (paths.length > 0) {
            for (const filePath of paths) {
              const lower = filePath.toLowerCase();
              if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
                const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || "";
                handleSelectFileRef.current({ name: fileName, path: filePath, is_dir: false });
                break;
              } else if (isImageFilePath(filePath)) {
                try {
                  const saved = await saveImageFile(
                    filePath,
                    selectedPathRef.current,
                    currentDirectoryRef.current
                  );
                  editorRef.current?.insertImage(saved.relative_path, saved.file_name);
                } catch (err) {
                  console.error("Failed to save and insert image:", err);
                  alert(`画像の保存・挿入に失敗しました: ${err}`);
                }
              } else {
                alert("Markdownファイル(.md)または画像ファイルのみサポートしています。");
              }
            }
          }
        });
        if (isMounted) unlistens.push(uFileDrop);
        else uFileDrop();
      } catch (err) {
        console.warn("Native menu event listening is not supported in this environment:", err);
      }
    };

    setupMenuListeners();

    return () => {
      isMounted = false;
      for (const unlisten of unlistens) {
        unlisten();
      }
    };
  }, []);

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
              title={`サイドバーの表示切替 (${formatKeys(shortcutConfig.toggle_sidebar)})`}
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
                    title={`未保存の変更があります (${formatKeys(shortcutConfig.save_file)} で保存)`}
                  />
                )}
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] italic">
                無題のドキュメント
              </span>
            )}
          </div>

          {/* 右: 保存ボタン / ステータス / テーマ切替 */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle
              theme={theme}
              resolvedTheme={resolvedTheme}
              onSelectTheme={setTheme}
            />
            {/* タブ機能の有効/無効切替ボタン */}
            <button
              onClick={handleToggleTabsEnabled}
              className={`p-1 rounded transition-colors ${
                isTabsEnabled
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                isTabsEnabled
                  ? `タブ機能を無効化 (単一ドキュメントモード) (${formatKeys(shortcutConfig.toggle_tabs)})`
                  : `タブ機能を有効化 (複数ファイルオープン) (${formatKeys(shortcutConfig.toggle_tabs)})`
              }
              aria-label={isTabsEnabled ? "タブ機能を無効化" : "タブ機能を有効化"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>
            <button
              onClick={handleToggleFocusMode}
              className={`p-1 rounded transition-colors ${
                isFocusMode
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                isFocusMode
                  ? `フォーカスモードを解除 (${formatKeys(shortcutConfig.toggle_focus_mode)})`
                  : `フォーカスモードに切り替え (${formatKeys(shortcutConfig.toggle_focus_mode)})`
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3" />
              </svg>
            </button>
            <button
              onClick={handleToggleSourceMode}
              className={`p-1 rounded transition-colors ${
                isSourceMode
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                isSourceMode
                  ? `WYSIWYGモードに切り替え (${formatKeys(shortcutConfig.toggle_source_mode)})`
                  : `Markdownソース直接編集モードに切り替え (${formatKeys(shortcutConfig.toggle_source_mode)})`
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              onClick={handleToggleRightSidebar}
              className={`p-1 rounded transition-colors ${
                isRightSidebarOpen
                  ? "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={`アウトラインを表示 (${formatKeys(shortcutConfig.toggle_right_sidebar)})`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            {/* title="チートシート (Markdown & ショートカット) (F1)" */}
            <button
              onClick={handleToggleCheatSheet}
              className={`p-1 rounded transition-colors ${
                isCheatSheetOpen
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                areKeysEqual(shortcutConfig.open_cheatsheet, ["F1"])
                  ? "チートシート (Markdown & ショートカット) (F1)"
                  : `チートシート (${formatKeys(shortcutConfig.open_cheatsheet)})`
              }
              aria-label="チートシートを表示"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
              </svg>
            </button>
            {/* title="ショートカットキー設定 (Ctrl+,)" */}
            <button
              onClick={handleToggleShortcutSettings}
              className={`p-1 rounded transition-colors ${
                isShortcutSettingsOpen
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                areKeysEqual(shortcutConfig.open_shortcuts_settings, ["Ctrl", ","])
                  ? "ショートカットキー設定 (Ctrl+,)"
                  : `ショートカットキー設定 (${formatKeys(shortcutConfig.open_shortcuts_settings)})`
              }
              aria-label="ショートカットキー設定を開く"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* HTMLエクスポートボタン */}
            <button
              onClick={() => handleOpenExportModal("html")}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={
                areKeysEqual(shortcutConfig.export_html, ["Ctrl", "Shift", "E"])
                  ? "HTML形式でエクスポート (Ctrl+Shift+E)"
                  : `HTML形式でエクスポート (${formatKeys(shortcutConfig.export_html)})`
              }
              aria-label="HTML形式でエクスポート"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>

            {/* PDFエクスポートボタン */}
            <button
              onClick={() => handleOpenExportModal("pdf")}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={
                areKeysEqual(shortcutConfig.export_pdf, ["Ctrl", "Shift", "P"])
                  ? "PDF形式でエクスポート (Ctrl+Shift+P)"
                  : `PDF形式でエクスポート (${formatKeys(shortcutConfig.export_pdf)})`
              }
              aria-label="PDF形式でエクスポート (印刷)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>

            {currentFileName && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                title={
                  areKeysEqual(shortcutConfig.save_file, ["Ctrl", "S"])
                    ? "保存 (Ctrl+S)"
                    : `ファイルを保存 (${formatKeys(shortcutConfig.save_file)})`
                }
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

        {/* タブバー（複数ファイルオープン対応: タブ機能有効時のみ表示） */}
        {isTabsEnabled && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={handleMenuNewFile}
          />
        )}

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
          ) : isSourceMode ? (
            <SourceEditor
              key={selectedPath ?? "__source__"}
              content={fileContent ?? ""}
              theme={resolvedTheme}
              onChange={handleContentChange}
              onSave={handleSave}
              onExitSourceMode={() => setIsSourceMode(false)}
              onToggleSourceMode={handleToggleSourceMode}
              isFocusMode={isFocusMode}
              onToggleFocusMode={handleToggleFocusMode}
              filePath={selectedPath}
            />
          ) : (
            <TyporiEditor
              ref={editorRef}
              key={selectedPath ?? "__welcome__"}
              content={fileContent ?? undefined}
              isDirty={isDirty}
              filePath={selectedPath}
              workspaceDir={currentDirectory}
              onChange={handleContentChange}
              onToggleSourceMode={handleToggleSourceMode}
              isFocusMode={isFocusMode}
              onToggleFocusMode={handleToggleFocusMode}
              isRightSidebarOpen={isRightSidebarOpen}
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
            <button
              onClick={handleToggleFocusMode}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                isFocusMode
                  ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
              }`}
              title="フォーカスモードの切替 (カーソル行以外を暗くする) (F8)"
            >
              {isFocusMode ? "◎ フォーカス中" : "フォーカス"}
            </button>
            <button
              onClick={handleToggleSourceMode}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                isSourceMode
                  ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
              }`}
              title="編集モードの切替 (WYSIWYG / ソースコード) (Ctrl + /)"
            >
              {isSourceMode ? "</> ソースモード" : "WYSIWYG"}
            </button>
            <span>{wordCount} 単語</span>
            <span>{charCount} 文字</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-500"}`} />
              <span>{isDirty ? "未保存" : "同期済み"}</span>
            </span>
          </div>
        </footer>

      </div>
      
      {/* 右サイドバー（アウトライン） */}
      <OutlineSidebar
        content={fileContent}
        isOpen={isRightSidebarOpen}
        onSelectHeading={handleSelectHeading}
      />


      {/* チートシートモーダル */}
      <CheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        shortcutConfig={shortcutConfig}
      />

      {/* ショートカットキー設定モーダル */}
      <ShortcutSettingsModal
        isOpen={isShortcutSettingsOpen}
        onClose={() => setIsShortcutSettingsOpen(false)}
        currentConfig={shortcutConfig}
        onSave={saveShortcutConfig}
      />

      {/* エクスポートモーダル (HTML / PDF) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportModal}
        currentFilePath={selectedPath}
        currentDirectory={currentDirectory}
        markdownContent={getCurrentMarkdown()}
        initialFormat={exportModalFormat}
      />
    </div>
  );
}

export default App;
