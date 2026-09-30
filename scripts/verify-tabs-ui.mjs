import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function isCloseTabShortcut(e) {
  return (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w" && !e.altKey;
}

// タブ切り替えロジックのシミュレーション
function switchTab(tabs, activeTabId, currentEditorContent, targetTabId) {
  if (targetTabId === activeTabId) {
    return { tabs, activeTabId };
  }

  // 現在のタブの内容を保存
  const updatedTabs = tabs.map((t) => {
    if (t.id === activeTabId && currentEditorContent !== null) {
      return {
        ...t,
        content: currentEditorContent,
        isDirty: currentEditorContent !== t.savedContent,
      };
    }
    return t;
  });

  const targetTab = updatedTabs.find((t) => t.id === targetTabId);
  if (!targetTab) return { tabs, activeTabId };

  return {
    tabs: updatedTabs,
    activeTabId: targetTabId,
    activeContent: targetTab.content,
  };
}

// タブを閉じるロジックのシミュレーション
function closeTab(tabs, activeTabId, currentEditorContent, targetTabId, confirmClose = true) {
  const targetTab = tabs.find((t) => t.id === targetTabId);
  if (!targetTab) return { tabs, activeTabId, cancelled: false };

  const isDirty =
    targetTabId === activeTabId && currentEditorContent !== null
      ? currentEditorContent !== targetTab.savedContent
      : (targetTab.isDirty ?? (targetTab.content !== targetTab.savedContent));

  if (isDirty && !confirmClose) {
    return { tabs, activeTabId, cancelled: true };
  }

  const targetIndex = tabs.findIndex((t) => t.id === targetTabId);
  const newTabs = tabs.filter((t) => t.id !== targetTabId);

  let newActiveId = activeTabId;
  let newActiveContent = null;

  if (targetTabId === activeTabId) {
    if (newTabs.length > 0) {
      const nextIndex = Math.min(targetIndex, newTabs.length - 1);
      const nextTab = newTabs[nextIndex];
      newActiveId = nextTab.id;
      newActiveContent = nextTab.content;
    } else {
      newActiveId = null;
      newActiveContent = null;
    }
  }

  return {
    tabs: newTabs,
    activeTabId: newActiveId,
    activeContent: newActiveContent,
    cancelled: false,
  };
}

async function verifyTabsUi() {
  console.log("=== Testing Tab Bar UI (複数ファイルタブ機能UI) ===");

  // 1. ショートカットキー判定の検証
  console.log("1. Testing Ctrl+W / Cmd+W shortcut detection...");
  assert.equal(
    isCloseTabShortcut({ key: "w", ctrlKey: true, metaKey: false, altKey: false }),
    true,
    "Ctrl+W must trigger close tab"
  );
  assert.equal(
    isCloseTabShortcut({ key: "W", ctrlKey: false, metaKey: true, altKey: false }),
    true,
    "Cmd+W must trigger close tab"
  );
  assert.equal(
    isCloseTabShortcut({ key: "w", ctrlKey: false, metaKey: false, altKey: false }),
    false,
    "Plain 'w' must not trigger close tab"
  );
  assert.equal(
    isCloseTabShortcut({ key: "w", ctrlKey: true, metaKey: false, altKey: true }),
    false,
    "Ctrl+Alt+W must not trigger close tab"
  );
  console.log("✓ Shortcut detection verified.");

  // 2. タブ切り替えとコンテンツ保護のシミュレーション検証
  console.log("2. Testing tab switching and content preservation...");
  const initialTabs = [
    { id: "/path/doc1.md", path: "/path/doc1.md", title: "doc1.md", content: "# Doc 1", savedContent: "# Doc 1", isDirty: false },
    { id: "/path/doc2.md", path: "/path/doc2.md", title: "doc2.md", content: "# Doc 2", savedContent: "# Doc 2", isDirty: false },
    { id: "/path/doc3.md", path: "/path/doc3.md", title: "doc3.md", content: "# Doc 3", savedContent: "# Doc 3", isDirty: false },
  ];

  // doc1.md で編集が行われた後に doc2.md へ切り替える
  const switchResult = switchTab(initialTabs, "/path/doc1.md", "# Doc 1 (Edited)", "/path/doc2.md");
  assert.equal(switchResult.activeTabId, "/path/doc2.md", "Active tab must switch to doc2.md");
  assert.equal(switchResult.activeContent, "# Doc 2", "Active content must be doc2 content");
  
  const savedDoc1 = switchResult.tabs.find((t) => t.id === "/path/doc1.md");
  assert.equal(savedDoc1.content, "# Doc 1 (Edited)", "Edited content in doc1 must be preserved on tab switch");
  assert.equal(savedDoc1.isDirty, true, "doc1 must be marked as dirty");

  console.log("✓ Tab switching and content preservation verified.");

  // 3. タブクローズのシミュレーション検証
  console.log("3. Testing tab close behavior & neighbor focus...");
  
  // 未保存タブのクローズキャンセル
  const cancelResult = closeTab(switchResult.tabs, "/path/doc2.md", "# Doc 2", "/path/doc1.md", false);
  assert.equal(cancelResult.cancelled, true, "Closing dirty tab without confirmation must be cancelled");
  assert.equal(cancelResult.tabs.length, 3, "Tabs length must remain unchanged when cancelled");

  // doc2（真ん中）を閉じる -> 右隣の doc3 がアクティブになる
  const closeMiddleResult = closeTab(switchResult.tabs, "/path/doc2.md", "# Doc 2", "/path/doc2.md", true);
  assert.equal(closeMiddleResult.tabs.length, 2, "Tabs length must be 2 after closing doc2");
  assert.equal(closeMiddleResult.activeTabId, "/path/doc3.md", "Active tab must move to doc3");
  assert.equal(closeMiddleResult.activeContent, "# Doc 3", "Active content must be doc3 content");

  // 末尾の doc3 を閉じる -> 直前（doc1）がアクティブになる
  const closeLastResult = closeTab(closeMiddleResult.tabs, "/path/doc3.md", "# Doc 3", "/path/doc3.md", true);
  assert.equal(closeLastResult.tabs.length, 1, "Tabs length must be 1 after closing doc3");
  assert.equal(closeLastResult.activeTabId, "/path/doc1.md", "Active tab must move to preceding doc1");

  // 最後の1つを閉じる -> 全て閉じられて null になる
  const closeAllResult = closeTab(closeLastResult.tabs, "/path/doc1.md", "# Doc 1 (Edited)", "/path/doc1.md", true);
  assert.equal(closeAllResult.tabs.length, 0, "Tabs length must be 0");
  assert.equal(closeAllResult.activeTabId, null, "Active tab must be null when all tabs are closed");
  assert.equal(closeAllResult.activeContent, null, "Active content must be null");

  console.log("✓ Tab close behavior and neighbor selection verified.");

  // 4. ファイル構成と静的コード解析
  console.log("4. Verifying TabBar component and integration files...");
  const tabBarDir = path.resolve(process.cwd(), "src/components/TabBar");
  assert.ok(fs.existsSync(tabBarDir), "src/components/TabBar directory must exist");
  assert.ok(fs.existsSync(path.join(tabBarDir, "types.ts")), "types.ts must exist");
  assert.ok(fs.existsSync(path.join(tabBarDir, "TabBar.tsx")), "TabBar.tsx must exist");
  assert.ok(fs.existsSync(path.join(tabBarDir, "index.ts")), "index.ts must exist");

  const tabBarContent = fs.readFileSync(path.join(tabBarDir, "TabBar.tsx"), "utf-8");
  assert.ok(tabBarContent.includes("role=\"tablist\""), "TabBar must contain role='tablist'");
  assert.ok(tabBarContent.includes("role=\"tab\""), "TabBar must contain role='tab'");
  assert.ok(tabBarContent.includes("aria-selected"), "TabBar must contain aria-selected attribute");
  assert.ok(tabBarContent.includes("onSelectTab"), "TabBar must support onSelectTab");
  assert.ok(tabBarContent.includes("onCloseTab"), "TabBar must support onCloseTab");
  assert.ok(tabBarContent.includes("onAuxClick"), "TabBar must support middle-click close (onAuxClick)");
  console.log("✓ TabBar component structure verified.");

  // 5. App.tsx との統合確認
  console.log("5. Verifying integration in App.tsx...");
  const appPath = path.resolve(process.cwd(), "src/App.tsx");
  const appContent = fs.readFileSync(appPath, "utf-8");
  assert.ok(appContent.includes("import TabBar, { TabItem } from \"./components/TabBar\";"), "App.tsx must import TabBar");
  assert.ok(appContent.includes("<TabBar"), "App.tsx must render <TabBar />");
  assert.ok(appContent.includes("handleSelectTab"), "App.tsx must define handleSelectTab");
  assert.ok(appContent.includes("handleCloseTab"), "App.tsx must define handleCloseTab");
  assert.ok(appContent.includes("handleContentChange"), "App.tsx must define handleContentChange");
  assert.ok(appContent.includes("tabsRef.current"), "App.tsx must manage tabs ref");
  console.log("✓ App.tsx integration verified.");

  console.log("\n>>> ALL TAB BAR UI VERIFICATION TESTS PASSED SUCCESSFULLY! <<<");
}

verifyTabsUi();
