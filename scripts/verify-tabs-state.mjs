import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 簡易 localStorage モック
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] ?? null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// タブ機能設定フックの初期化・トグルロジックのシミュレーション
function createTabSettingsSimulator(storage) {
  const STORAGE_KEY = "typori:tabs_enabled";

  function getInitialState() {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === "true";
      }
    } catch (e) {
      // ignore
    }
    return false; // デフォルトは無効 (false)
  }

  let isTabsEnabled = getInitialState();

  function setIsTabsEnabled(value) {
    const next = typeof value === "function" ? value(isTabsEnabled) : value;
    isTabsEnabled = next;
    storage.setItem(STORAGE_KEY, String(next));
    return next;
  }

  function toggleTabsEnabled() {
    return setIsTabsEnabled(!isTabsEnabled);
  }

  return {
    get isTabsEnabled() {
      return isTabsEnabled;
    },
    setIsTabsEnabled,
    toggleTabsEnabled,
  };
}

// タブ無効時の単一ファイルオープンロジックのシミュレーション
function openFileInSingleMode(currentDoc, newFileEntry, confirmDiscard = true) {
  // 未保存チェック
  if (currentDoc && currentDoc.isDirty && !confirmDiscard) {
    return {
      cancelled: true,
      currentDoc,
      tabs: [currentDoc],
    };
  }

  const newTab = {
    id: newFileEntry.path,
    path: newFileEntry.path,
    title: newFileEntry.name,
    content: newFileEntry.content,
    savedContent: newFileEntry.content,
    isDirty: false,
  };

  return {
    cancelled: false,
    currentDoc: newTab,
    tabs: [newTab],
  };
}

// タブ無効化トグル時の整合性処理シミュレーション
function disableTabsMode(tabs, activeTabId, confirmDiscard = true) {
  const otherDirtyTabs = tabs.filter(
    (t) => t.id !== activeTabId && (t.isDirty ?? t.content !== t.savedContent)
  );

  if (otherDirtyTabs.length > 0 && !confirmDiscard) {
    return {
      cancelled: true,
      tabs,
    };
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);
  return {
    cancelled: false,
    tabs: activeTab ? [activeTab] : [],
  };
}

async function verifyTabsState() {
  console.log("=== Testing Tabs Global State & Default Disabled Logic (タブ機能状態管理・デフォルト無効化) ===");

  // 1. デフォルト値と localStorage 永続化の検証
  console.log("1. Testing default disabled state & localStorage persistence...");
  const storage = new LocalStorageMock();
  const sim = createTabSettingsSimulator(storage);

  assert.equal(
    sim.isTabsEnabled,
    false,
    "Default isTabsEnabled must be false (デフォルト無効)"
  );

  // トグルで有効化
  sim.toggleTabsEnabled();
  assert.equal(sim.isTabsEnabled, true, "isTabsEnabled must be true after toggle");
  assert.equal(storage.getItem("typori:tabs_enabled"), "true", "localStorage must store 'true'");

  // 新しいセッションで復元
  const sim2 = createTabSettingsSimulator(storage);
  assert.equal(sim2.isTabsEnabled, true, "Should restore enabled state from localStorage");

  // トグルで再度無効化
  sim2.toggleTabsEnabled();
  assert.equal(sim2.isTabsEnabled, false, "isTabsEnabled must be false after toggle");
  assert.equal(storage.getItem("typori:tabs_enabled"), "false", "localStorage must store 'false'");

  console.log("✓ Default disabled state and persistence verified.");

  // 2. タブ無効時の単一ファイルモード動作検証
  console.log("2. Testing single-file mode when tabs are disabled...");
  const docA = {
    id: "/workspace/docA.md",
    path: "/workspace/docA.md",
    title: "docA.md",
    content: "# Doc A (Dirty)",
    savedContent: "# Doc A",
    isDirty: true,
  };

  // 未保存時のキャンセル
  const discardDenied = openFileInSingleMode(docA, { path: "/workspace/docB.md", name: "docB.md", content: "# Doc B" }, false);
  assert.equal(discardDenied.cancelled, true, "Discarding dirty file must be cancellable");
  assert.equal(discardDenied.tabs.length, 1, "Must retain 1 tab");
  assert.equal(discardDenied.tabs[0].id, "/workspace/docA.md", "Must retain docA");

  // 未保存確認を承認して開く
  const discardApproved = openFileInSingleMode(docA, { path: "/workspace/docB.md", name: "docB.md", content: "# Doc B" }, true);
  assert.equal(discardApproved.cancelled, false, "Must proceed when confirmed");
  assert.equal(discardApproved.tabs.length, 1, "Tabs array must have exactly 1 element in single mode");
  assert.equal(discardApproved.tabs[0].id, "/workspace/docB.md", "Must replace with docB");

  console.log("✓ Single-file mode replacement and unsaved guards verified.");

  // 3. タブ無効化時のタブ整合性（他タブの破棄と未保存保護）検証
  console.log("3. Testing disabling tabs with multiple open tabs...");
  const multipleTabs = [
    { id: "/path/doc1.md", path: "/path/doc1.md", title: "doc1.md", content: "# 1", savedContent: "# 1", isDirty: false },
    { id: "/path/doc2.md", path: "/path/doc2.md", title: "doc2.md", content: "# 2", savedContent: "# 2", isDirty: false },
    { id: "/path/doc3.md", path: "/path/doc3.md", title: "doc3.md", content: "# 3 (Dirty)", savedContent: "# 3", isDirty: true },
  ];

  // doc1 がアクティブで、doc3 に未保存がある場合にキャンセル
  const disableCancelled = disableTabsMode(multipleTabs, "/path/doc1.md", false);
  assert.equal(disableCancelled.cancelled, true, "Should cancel disabling tabs if unsaved tab exists and discard is rejected");
  assert.equal(disableCancelled.tabs.length, 3, "All tabs should remain untouched");

  // 未保存破棄を承認して無効化
  const disableApproved = disableTabsMode(multipleTabs, "/path/doc1.md", true);
  assert.equal(disableApproved.cancelled, false, "Should proceed with disabling tabs");
  assert.equal(disableApproved.tabs.length, 1, "Only active tab should remain");
  assert.equal(disableApproved.tabs[0].id, "/path/doc1.md", "Active tab doc1 must be retained");

  console.log("✓ Disabling tabs cleanup and unsaved tab protection verified.");

  // 4. ソースコードの静的検証
  console.log("4. Verifying hook and App.tsx implementation...");
  const hookPath = path.resolve(process.cwd(), "src/hooks/useTabSettings.ts");
  assert.ok(fs.existsSync(hookPath), "src/hooks/useTabSettings.ts must exist");
  const hookContent = fs.readFileSync(hookPath, "utf-8");
  assert.ok(hookContent.includes("typori:tabs_enabled"), "Hook must use storage key typori:tabs_enabled");
  assert.ok(hookContent.includes("return false;"), "Hook default value must be false");
  assert.ok(hookContent.includes("toggleTabsEnabled"), "Hook must export toggleTabsEnabled");

  const appPath = path.resolve(process.cwd(), "src/App.tsx");
  const appContent = fs.readFileSync(appPath, "utf-8");
  assert.ok(appContent.includes("useTabSettings"), "App.tsx must use useTabSettings hook");
  assert.ok(appContent.includes("isTabsEnabled"), "App.tsx must reference isTabsEnabled");
  assert.ok(appContent.includes("handleToggleTabsEnabled"), "App.tsx must define handleToggleTabsEnabled");
  assert.ok(appContent.includes("menu:toggle_tabs"), "App.tsx must listen to menu:toggle_tabs event");
  assert.ok(appContent.includes("{isTabsEnabled && ("), "App.tsx must conditionally render TabBar only when isTabsEnabled is true");
  assert.ok(appContent.includes("isTabsEnabled ? \"タブ機能を無効化"), "App.tsx must have toggle button with proper tooltip");

  console.log("✓ Code static verification passed.");

  console.log("\n>>> ALL TABS GLOBAL STATE & DEFAULT DISABLED TESTS PASSED SUCCESSFULLY! <<<");
}

verifyTabsState();
