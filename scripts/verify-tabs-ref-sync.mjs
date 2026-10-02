import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function normalizeLineEndings(text) {
  if (!text) return text ?? "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isContentDirty(current, baseline) {
  if (current === null || current === undefined) {
    return false;
  }
  if (baseline === null || baseline === undefined) {
    return Boolean(current);
  }
  return normalizeLineEndings(current) !== normalizeLineEndings(baseline);
}

// シミュレータ: App.tsx のタブ切り替え・ファイルオープン・新規作成・Ref即時同期ロジック
function createEditorStateManager() {
  const state = {
    selectedPath: null,
    fileContent: null,
    savedContent: null,
    tabs: [],
    activeTabId: null,
    isTabsEnabled: true,
  };

  const refs = {
    selectedPathRef: { current: null },
    fileContentRef: { current: null },
    savedContentRef: { current: null },
    tabsRef: { current: [] },
    activeTabIdRef: { current: null },
    isTabsEnabledRef: { current: true },
  };

  // 即時Ref同期ヘルパー
  function syncRefs(updates) {
    if ("selectedPath" in updates) {
      state.selectedPath = updates.selectedPath;
      refs.selectedPathRef.current = updates.selectedPath;
    }
    if ("fileContent" in updates) {
      state.fileContent = updates.fileContent;
      refs.fileContentRef.current = updates.fileContent;
    }
    if ("savedContent" in updates) {
      state.savedContent = updates.savedContent;
      refs.savedContentRef.current = updates.savedContent;
    }
    if ("tabs" in updates) {
      state.tabs = updates.tabs;
      refs.tabsRef.current = updates.tabs;
    }
    if ("activeTabId" in updates) {
      state.activeTabId = updates.activeTabId;
      refs.activeTabIdRef.current = updates.activeTabId;
    }
    if ("isTabsEnabled" in updates) {
      state.isTabsEnabled = updates.isTabsEnabled;
      refs.isTabsEnabledRef.current = updates.isTabsEnabled;
    }
  }

  // コンテンツ変更
  function handleContentChange(markdown) {
    const normalized = normalizeLineEndings(markdown);
    refs.fileContentRef.current = normalized;
    state.fileContent = normalized;

    const nextTabs = state.tabs.map((t) =>
      t.id === refs.activeTabIdRef.current
        ? { ...t, content: normalized, isDirty: isContentDirty(normalized, t.savedContent) }
        : t
    );
    refs.tabsRef.current = nextTabs;
    state.tabs = nextTabs;
  }

  // タブ選択（切り替え）
  function handleSelectTab(tabId) {
    if (tabId === refs.activeTabIdRef.current) return;

    const currentContent = refs.fileContentRef.current;
    const currentActiveId = refs.activeTabIdRef.current;

    const updatedTabs = refs.tabsRef.current.map((t) => {
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
    const normTargetSavedContent = normalizeLineEndings(targetTab.savedContent);
    const targetIsDirty = isContentDirty(normTargetContent, normTargetSavedContent);

    const syncedTabs = updatedTabs.map((t) =>
      t.id === tabId
        ? { ...t, content: normTargetContent, savedContent: normTargetSavedContent, isDirty: targetIsDirty }
        : t
    );

    // 即時Ref同期
    syncRefs({
      tabs: syncedTabs,
      activeTabId: tabId,
      selectedPath: targetTab.path,
      fileContent: normTargetContent,
      savedContent: normTargetSavedContent,
    });
  }

  // ファイルオープン
  function handleOpenFile(filePath, rawContent) {
    const content = normalizeLineEndings(rawContent);
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || filePath;

    if (!refs.isTabsEnabledRef.current) {
      const newTab = {
        id: filePath,
        path: filePath,
        title: fileName,
        content,
        savedContent: content,
        isDirty: false,
      };
      syncRefs({
        selectedPath: filePath,
        fileContent: content,
        savedContent: content,
        tabs: [newTab],
        activeTabId: newTab.id,
      });
      return;
    }

    // 既に開かれているタブがあれば切り替え
    const existingTab = refs.tabsRef.current.find((t) => t.path === filePath || t.id === filePath);
    if (existingTab) {
      handleSelectTab(existingTab.id);
      return;
    }

    // 新規タブとして追加
    const currentActiveId = refs.activeTabIdRef.current;
    const currentContent = refs.fileContentRef.current;
    const updatedTabs = refs.tabsRef.current.map((t) => {
      if (t.id === currentActiveId && currentContent !== null) {
        return {
          ...t,
          content: currentContent,
          isDirty: isContentDirty(currentContent, t.savedContent),
        };
      }
      return t;
    });

    const newTab = {
      id: filePath,
      path: filePath,
      title: fileName,
      content,
      savedContent: content,
      isDirty: false,
    };

    const newTabs = [...updatedTabs, newTab];
    syncRefs({
      tabs: newTabs,
      activeTabId: newTab.id,
      selectedPath: filePath,
      fileContent: content,
      savedContent: content,
    });
  }

  // 新規ファイル作成
  function handleCreateFile(filePath, initialContent = "# New File\n\n") {
    const content = normalizeLineEndings(initialContent);
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || filePath;

    if (!refs.isTabsEnabledRef.current) {
      const newTab = {
        id: filePath,
        path: filePath,
        title: fileName,
        content,
        savedContent: content,
        isDirty: false,
      };
      syncRefs({
        selectedPath: filePath,
        fileContent: content,
        savedContent: content,
        tabs: [newTab],
        activeTabId: newTab.id,
      });
      return;
    }

    const currentActiveId = refs.activeTabIdRef.current;
    const currentContent = refs.fileContentRef.current;
    const updatedTabs = refs.tabsRef.current.map((t) => {
      if (t.id === currentActiveId && currentContent !== null) {
        return {
          ...t,
          content: currentContent,
          isDirty: isContentDirty(currentContent, t.savedContent),
        };
      }
      return t;
    });

    const newTab = {
      id: filePath,
      path: filePath,
      title: fileName,
      content,
      savedContent: content,
      isDirty: false,
    };

    const newTabs = [...updatedTabs, newTab];
    syncRefs({
      tabs: newTabs,
      activeTabId: newTab.id,
      selectedPath: filePath,
      fileContent: content,
      savedContent: content,
    });
  }

  // タブクローズ
  function handleCloseTab(tabId) {
    const currentActiveId = refs.activeTabIdRef.current;
    const currentTabs = refs.tabsRef.current;
    const targetIndex = currentTabs.findIndex((t) => t.id === tabId);
    const newTabs = currentTabs.filter((t) => t.id !== tabId);

    if (tabId === currentActiveId) {
      if (newTabs.length > 0) {
        const nextIndex = Math.min(targetIndex, newTabs.length - 1);
        const nextTab = newTabs[nextIndex];
        const normNextContent = normalizeLineEndings(nextTab.content);
        const normNextSavedContent = normalizeLineEndings(nextTab.savedContent);
        const nextIsDirty = isContentDirty(normNextContent, normNextSavedContent);

        const syncedNewTabs = newTabs.map((t, idx) =>
          idx === nextIndex
            ? { ...t, content: normNextContent, savedContent: normNextSavedContent, isDirty: nextIsDirty }
            : t
        );

        syncRefs({
          tabs: syncedNewTabs,
          activeTabId: nextTab.id,
          selectedPath: nextTab.path,
          fileContent: normNextContent,
          savedContent: normNextSavedContent,
        });
      } else {
        syncRefs({
          tabs: [],
          activeTabId: null,
          selectedPath: null,
          fileContent: null,
          savedContent: null,
        });
      }
    } else {
      refs.tabsRef.current = newTabs;
      state.tabs = newTabs;
    }
  }

  // ファイル保存
  function handleSave() {
    const currentPath = refs.selectedPathRef.current;
    const currentContent = refs.fileContentRef.current;
    if (!currentPath || currentContent === null) return;

    const normalized = normalizeLineEndings(currentContent);
    syncRefs({
      fileContent: normalized,
      savedContent: normalized,
    });

    const nextTabs = refs.tabsRef.current.map((t) =>
      t.id === refs.activeTabIdRef.current || t.path === currentPath
        ? { ...t, content: normalized, savedContent: normalized, isDirty: false }
        : t
    );
    syncRefs({ tabs: nextTabs });
  }

  return {
    state,
    refs,
    handleContentChange,
    handleSelectTab,
    handleOpenFile,
    handleCreateFile,
    handleCloseTab,
    handleSave,
  };
}

async function verifyTabsRefSync() {
  console.log("=== Testing Tab Switching, File Open, Immediate Ref Sync & Dirty Isolation ===");

  // 1. タブオープンと即時Ref同期の検証
  console.log("1. Testing file open and immediate ref synchronization...");
  const manager = createEditorStateManager();

  manager.handleOpenFile("/docs/doc1.md", "# Doc 1\r\n\r\nInitial Content");

  assert.equal(manager.refs.selectedPathRef.current, "/docs/doc1.md");
  assert.equal(manager.refs.activeTabIdRef.current, "/docs/doc1.md");
  assert.equal(manager.refs.fileContentRef.current, "# Doc 1\n\nInitial Content");
  assert.equal(manager.refs.savedContentRef.current, "# Doc 1\n\nInitial Content");
  assert.equal(manager.refs.tabsRef.current.length, 1);
  assert.equal(manager.refs.tabsRef.current[0].isDirty, false, "Initial tab must be clean");

  // 2つ目のファイルを開く
  manager.handleOpenFile("/docs/doc2.md", "# Doc 2\n\nContent 2");
  assert.equal(manager.refs.selectedPathRef.current, "/docs/doc2.md");
  assert.equal(manager.refs.activeTabIdRef.current, "/docs/doc2.md");
  assert.equal(manager.refs.tabsRef.current.length, 2);
  assert.equal(manager.refs.tabsRef.current[1].isDirty, false, "Newly opened doc2 must be clean");

  console.log("✓ File open and immediate ref synchronization verified.");

  // 2. doc2 を編集し、doc1 に切り替えた時の未保存状態の独立性担保の検証
  console.log("2. Testing tab switching and dirty state isolation...");
  manager.handleContentChange("# Doc 2\n\nContent 2 (Modified!)");

  assert.equal(manager.refs.fileContentRef.current, "# Doc 2\n\nContent 2 (Modified!)");
  assert.equal(manager.refs.tabsRef.current[1].isDirty, true, "doc2 must be marked dirty");

  // doc1 に切り替え
  manager.handleSelectTab("/docs/doc1.md");

  // 切り替え直後にすべてのRefが doc1 に即時同期されていること
  assert.equal(manager.refs.activeTabIdRef.current, "/docs/doc1.md", "Active tab ref must be doc1");
  assert.equal(manager.refs.selectedPathRef.current, "/docs/doc1.md", "Selected path ref must be doc1");
  assert.equal(manager.refs.fileContentRef.current, "# Doc 1\n\nInitial Content", "fileContentRef must be doc1 content");
  assert.equal(manager.refs.savedContentRef.current, "# Doc 1\n\nInitial Content", "savedContentRef must be doc1 saved content");

  // doc1 の未保存状態は doc2 の影響を受けず false（独立性担保）であること
  const doc1Tab = manager.refs.tabsRef.current.find((t) => t.id === "/docs/doc1.md");
  assert.equal(doc1Tab.isDirty, false, "doc1 must remain clean (isolated from doc2's dirty state)");

  // doc2 の未保存状態は保持されていること
  const doc2Tab = manager.refs.tabsRef.current.find((t) => t.id === "/docs/doc2.md");
  assert.equal(doc2Tab.isDirty, true, "doc2 must remain dirty in tabs array");
  assert.equal(doc2Tab.content, "# Doc 2\n\nContent 2 (Modified!)", "doc2 content must be preserved");

  console.log("✓ Tab switching and dirty state isolation verified.");

  // 3. 新規ファイル作成時の即時Ref同期と未保存状態独立性
  console.log("3. Testing create file immediate ref sync & dirty isolation...");
  manager.handleCreateFile("/docs/doc3.md", "# Doc 3\n\nBrand new file");

  assert.equal(manager.refs.activeTabIdRef.current, "/docs/doc3.md");
  assert.equal(manager.refs.selectedPathRef.current, "/docs/doc3.md");
  assert.equal(manager.refs.fileContentRef.current, "# Doc 3\n\nBrand new file");
  assert.equal(manager.refs.savedContentRef.current, "# Doc 3\n\nBrand new file");
  assert.equal(manager.refs.tabsRef.current.length, 3);

  const doc3Tab = manager.refs.tabsRef.current.find((t) => t.id === "/docs/doc3.md");
  assert.equal(doc3Tab.isDirty, false, "New file must start with isDirty = false");

  console.log("✓ Create file immediate ref sync verified.");

  // 4. 保存時の即時Ref同期
  console.log("4. Testing save file immediate ref sync...");
  // doc2 に戻って保存する
  manager.handleSelectTab("/docs/doc2.md");
  assert.equal(manager.refs.tabsRef.current.find((t) => t.id === "/docs/doc2.md").isDirty, true);

  manager.handleSave();
  assert.equal(manager.refs.savedContentRef.current, "# Doc 2\n\nContent 2 (Modified!)");
  assert.equal(manager.refs.tabsRef.current.find((t) => t.id === "/docs/doc2.md").isDirty, false);

  console.log("✓ Save file immediate ref sync verified.");

  // 5. タブクローズ時の即時Ref同期
  console.log("5. Testing close tab immediate ref sync...");
  // doc2 を閉じる -> 右隣の doc3 にフォーカスが移動
  manager.handleCloseTab("/docs/doc2.md");
  assert.equal(manager.refs.tabsRef.current.length, 2);
  assert.equal(manager.refs.activeTabIdRef.current, "/docs/doc3.md");
  assert.equal(manager.refs.selectedPathRef.current, "/docs/doc3.md");

  // 全タブを閉じる
  manager.handleCloseTab("/docs/doc1.md");
  manager.handleCloseTab("/docs/doc3.md");
  assert.equal(manager.refs.tabsRef.current.length, 0);
  assert.equal(manager.refs.activeTabIdRef.current, null);
  assert.equal(manager.refs.selectedPathRef.current, null);
  assert.equal(manager.refs.fileContentRef.current, null);

  console.log("✓ Close tab immediate ref sync verified.");

  // 6. 実コード (App.tsx, TabBar.tsx) の静的検証
  console.log("6. Verifying App.tsx and TabBar.tsx static implementation...");
  const appPath = path.resolve(process.cwd(), "src/App.tsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  // handleSelectTab 内で即時Ref同期を行っていること
  assert.ok(
    appContent.includes("tabsRef.current = syncedTabs;"),
    "handleSelectTab must immediately sync tabsRef.current"
  );
  assert.ok(
    appContent.includes("activeTabIdRef.current = tabId;"),
    "handleSelectTab must immediately sync activeTabIdRef.current"
  );
  assert.ok(
    appContent.includes("fileContentRef.current = normTargetContent;"),
    "handleSelectTab must immediately sync fileContentRef.current"
  );
  assert.ok(
    appContent.includes("savedContentRef.current = normTargetSavedContent;"),
    "handleSelectTab must immediately sync savedContentRef.current"
  );

  // handleSelectFile 内で即時Ref同期を行っていること
  assert.ok(
    appContent.includes("tabsRef.current = newTabs;"),
    "handleSelectFile must immediately sync tabsRef.current"
  );
  assert.ok(
    appContent.includes("activeTabIdRef.current = newTab.id;"),
    "handleSelectFile must immediately sync activeTabIdRef.current"
  );

  // handleCreateFile 内で即時Ref同期を行っていること
  assert.ok(
    appContent.includes("tabsRef.current = [newTab];"),
    "handleCreateFile must immediately sync single mode tabsRef.current"
  );

  // handleSave 内で即時Ref同期を行っていること
  assert.ok(
    appContent.includes("fileContentRef.current = normalizedContent;"),
    "handleSave must immediately sync fileContentRef.current"
  );
  assert.ok(
    appContent.includes("savedContentRef.current = normalizedContent;"),
    "handleSave must immediately sync savedContentRef.current"
  );

  // SourceEditor に key prop が付与されていること
  assert.ok(
    appContent.includes('key={selectedPath ?? "__source__"}'),
    "SourceEditor must have key prop for clean remount on file switch"
  );

  // TabBar.tsx で isContentDirty が利用されていること
  const tabBarPath = path.resolve(process.cwd(), "src/components/TabBar/TabBar.tsx");
  const tabBarContent = fs.readFileSync(tabBarPath, "utf-8");
  assert.ok(
    tabBarContent.includes("isContentDirty(tab.content, tab.savedContent)"),
    "TabBar.tsx must use isContentDirty"
  );

  console.log("✓ App.tsx and TabBar.tsx static verification passed.");
  console.log("\n>>> ALL TABS REF SYNC & DIRTY ISOLATION TESTS PASSED! <<<");
}

verifyTabsRefSync();
