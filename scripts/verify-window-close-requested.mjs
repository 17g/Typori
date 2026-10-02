import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== ウィンドウクローズ (CloseRequested) 時の未保存警告フック & 権限設定検証 ===");

// 1. src-tauri/capabilities/default.json の権限設定検証
const defaultCapPath = path.resolve(projectRoot, "src-tauri/capabilities/default.json");
assert.ok(fs.existsSync(defaultCapPath), "src-tauri/capabilities/default.json が存在すること");
const capJson = JSON.parse(fs.readFileSync(defaultCapPath, "utf-8"));

const requiredPermissions = [
  "core:default",
  "core:event:default",
  "core:event:allow-listen",
  "core:event:allow-unlisten",
  "core:window:default",
  "core:window:allow-close",
  "core:window:allow-destroy",
];

for (const perm of requiredPermissions) {
  assert.ok(
    capJson.permissions.includes(perm),
    `capabilities/default.json に '${perm}' 権限が含まれていること`
  );
}
console.log("✓ capabilities/default.json に必要な window / event 権限が網羅されていることを確認");

// 2. src/App.tsx の実装検証
const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsx = fs.readFileSync(appTsxPath, "utf-8");

assert.ok(
  appTsx.includes('import { getCurrentWindow } from "@tauri-apps/api/window";'),
  "App.tsx で @tauri-apps/api/window から getCurrentWindow がインポートされていること"
);

assert.ok(
  appTsx.includes("fileContentRef = useRef<string | null>(fileContent);"),
  "App.tsx で fileContentRef が定義されていること"
);
assert.ok(
  appTsx.includes("savedContentRef = useRef<string | null>(savedContent);"),
  "App.tsx で savedContentRef が定義されていること"
);
assert.ok(
  appTsx.includes("isSourceModeRef = useRef<boolean>(isSourceMode);"),
  "App.tsx で isSourceModeRef が定義されていること"
);

assert.ok(
  appTsx.includes("const getUnsavedDocuments = useCallback("),
  "App.tsx に getUnsavedDocuments 関数が実装されていること"
);

assert.ok(
  appTsx.includes("appWindow.onCloseRequested(async (event) => {"),
  "App.tsx で appWindow.onCloseRequested が登録されていること"
);

assert.ok(
  appTsx.includes("event.preventDefault();"),
  "onCloseRequested 内で event.preventDefault() が呼び出されていること"
);

assert.ok(
  appTsx.includes("window.confirm(") && appTsx.includes("保存されていない変更があります"),
  "onCloseRequested 内で window.confirm による未保存警告ダイアログが呼び出されていること"
);

assert.ok(
  appTsx.includes("await appWindow.destroy();"),
  "ユーザーが終了を承認した場合に appWindow.destroy() が実行されること"
);

assert.ok(
  appTsx.includes("window.addEventListener(\"beforeunload\", handleBeforeUnload);"),
  "Web標準の beforeunload リスナーも併用されていること"
);

console.log("✓ App.tsx の CloseRequested イベント購読および未保存警告ロジックの実装を確認");

// 3. 未保存判定ロジックのシミュレーションテスト
function simulateGetUnsavedDocuments({
  fileContent,
  savedContent,
  selectedPath,
  isTabsEnabled,
  tabs,
  activeTabId,
}) {
  const currentContent = fileContent;
  const unsavedFileNames = [];

  if (isTabsEnabled) {
    for (const tab of tabs) {
      const tabContent =
        tab.id === activeTabId && currentContent !== null
          ? currentContent
          : tab.content;
      const isTabDirty =
        tab.id === activeTabId && currentContent !== null
          ? currentContent !== tab.savedContent
          : (tab.isDirty ?? (tabContent !== tab.savedContent));
      if (isTabDirty) {
        unsavedFileNames.push(tab.title);
      }
    }
  } else {
    const isCurDirty = Boolean(
      selectedPath !== null &&
      currentContent !== null &&
      savedContent !== null &&
      currentContent !== savedContent
    );
    if (isCurDirty) {
      const curFileName =
        selectedPath?.split(/[/\\]/).filter(Boolean).pop() || "現在のファイル";
      unsavedFileNames.push(curFileName);
    }
  }

  return {
    hasUnsaved: unsavedFileNames.length > 0,
    fileNames: unsavedFileNames,
  };
}

// Case 1: 変更なし
const r1 = simulateGetUnsavedDocuments({
  fileContent: "Hello",
  savedContent: "Hello",
  selectedPath: "/path/doc.md",
  isTabsEnabled: false,
  tabs: [],
  activeTabId: null,
});
assert.strictEqual(r1.hasUnsaved, false);
assert.strictEqual(r1.fileNames.length, 0);

// Case 2: 単一ファイルモードで未保存変更あり
const r2 = simulateGetUnsavedDocuments({
  fileContent: "Hello modified",
  savedContent: "Hello",
  selectedPath: "/path/doc.md",
  isTabsEnabled: false,
  tabs: [],
  activeTabId: null,
});
assert.strictEqual(r2.hasUnsaved, true);
assert.deepStrictEqual(r2.fileNames, ["doc.md"]);

// Case 3: タブ有効時にアクティブタブのみ変更あり
const r3 = simulateGetUnsavedDocuments({
  fileContent: "Tab 1 modified",
  savedContent: "Tab 1",
  selectedPath: "/path/tab1.md",
  isTabsEnabled: true,
  tabs: [
    { id: "1", title: "tab1.md", content: "Tab 1", savedContent: "Tab 1", isDirty: false },
    { id: "2", title: "tab2.md", content: "Tab 2", savedContent: "Tab 2", isDirty: false },
  ],
  activeTabId: "1",
});
assert.strictEqual(r3.hasUnsaved, true);
assert.deepStrictEqual(r3.fileNames, ["tab1.md"]);

// Case 4: タブ有効時に非アクティブタブに未保存変更あり
const r4 = simulateGetUnsavedDocuments({
  fileContent: "Tab 1 saved",
  savedContent: "Tab 1 saved",
  selectedPath: "/path/tab1.md",
  isTabsEnabled: true,
  tabs: [
    { id: "1", title: "tab1.md", content: "Tab 1 saved", savedContent: "Tab 1 saved", isDirty: false },
    { id: "2", title: "tab2.md", content: "Tab 2 dirty", savedContent: "Tab 2", isDirty: true },
  ],
  activeTabId: "1",
});
assert.strictEqual(r4.hasUnsaved, true);
assert.deepStrictEqual(r4.fileNames, ["tab2.md"]);

// Case 5: 複数タブが未保存の場合
const r5 = simulateGetUnsavedDocuments({
  fileContent: "Tab 1 dirty",
  savedContent: "Tab 1",
  selectedPath: "/path/tab1.md",
  isTabsEnabled: true,
  tabs: [
    { id: "1", title: "tab1.md", content: "Tab 1 dirty", savedContent: "Tab 1", isDirty: true },
    { id: "2", title: "tab2.md", content: "Tab 2 dirty", savedContent: "Tab 2", isDirty: true },
  ],
  activeTabId: "1",
});
assert.strictEqual(r5.hasUnsaved, true);
assert.deepStrictEqual(r5.fileNames, ["tab1.md", "tab2.md"]);

console.log("✓ 未保存ファイル判定ロジックのシミュレーションテスト（全ケース）合格");
console.log("\nすべての検証項目に合格しました！");
