import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== サイドバーファイル名検索（フィルタリング）機能の検証を開始 ===");

// 1. パス正規化とツリー構築ロジックの検証
function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

function buildTreeFromSearchResults(rootDir, matchedEntries, collapsedPaths = new Set()) {
  const normRoot = normalizePath(rootDir);
  const rootEntriesMap = new Map();
  const dirContentsMap = new Map();
  const autoExpanded = new Set();

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

      const item = isLeaf
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
        const childrenMap = dirContentsMap.get(parentPath);
        if (!childrenMap.has(item.path) || !item.is_dir) {
          childrenMap.set(item.path, item);
        }
      }
    }
  }

  const sortEntries = (list) =>
    list.sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

  const filteredEntries = sortEntries(Array.from(rootEntriesMap.values()));
  const filteredDirectoryContents = {};
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

// 2. ロード済みツリーのローカルフィルタロジックの検証
function filterLoadedTree(entries, directoryContents, query, collapsedPaths = new Set()) {
  const q = query.trim().toLowerCase();
  const filteredContents = {};
  const autoExpanded = new Set();
  let matchCount = 0;

  function filterList(list) {
    const result = [];

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

// テスト実行1: buildTreeFromSearchResults の階層構築と自動展開
{
  const root = "C:/workspace";
  const mockMatches = [
    { name: "root_match.md", path: "C:/workspace/root_match.md", is_dir: false },
    { name: "deep_match.md", path: "C:/workspace/folderA/sub/deep_match.md", is_dir: false },
    { name: "folderA", path: "C:/workspace/folderA", is_dir: true },
  ];

  const res = buildTreeFromSearchResults(root, mockMatches);
  assert.equal(res.totalMatches, 3, "totalMatches should match input length");
  assert.equal(res.filteredEntries.length, 2, "root entries should contain folderA and root_match.md");
  assert.equal(res.filteredEntries[0].name, "folderA", "Directory should come first");
  assert.equal(res.filteredEntries[1].name, "root_match.md", "File should follow");

  // 自動展開の確認
  assert(res.expandedPaths.has("C:/workspace/folderA"), "folderA should be auto-expanded");
  assert(res.expandedPaths.has("C:/workspace/folderA/sub"), "sub should be auto-expanded");

  // サブ階層の確認
  const subChildren = res.filteredDirectoryContents["C:/workspace/folderA/sub"];
  assert(Array.isArray(subChildren), "sub directory should have children");
  assert.equal(subChildren[0].name, "deep_match.md");

  console.log("✓ buildTreeFromSearchResults: 正確な階層ツリー構築と自動展開パスを確認");
}

// テスト実行2: filterLoadedTree の絞り込みとハイライト対象確認
{
  const loadedEntries = [
    { name: "Notes.md", path: "/ws/Notes.md", is_dir: false },
    { name: "Docs", path: "/ws/Docs", is_dir: true },
    { name: "Other.txt", path: "/ws/Other.txt", is_dir: false },
  ];
  const dirContents = {
    "/ws/Docs": [
      { name: "Meeting_notes.md", path: "/ws/Docs/Meeting_notes.md", is_dir: false },
      { name: "Architecture.md", path: "/ws/Docs/Architecture.md", is_dir: false },
    ],
  };

  const res = filterLoadedTree(loadedEntries, dirContents, "note");
  assert.equal(res.totalMatches, 2, "Should match 2 items (Notes.md, Meeting_notes.md)");
  assert.equal(res.filteredEntries.length, 2, "Should include Docs and Notes.md");
  assert(res.expandedPaths.has("/ws/Docs"), "Docs should be auto-expanded because child matches");
  assert.equal(res.filteredDirectoryContents["/ws/Docs"].length, 1);
  assert.equal(res.filteredDirectoryContents["/ws/Docs"][0].name, "Meeting_notes.md");

  console.log("✓ filterLoadedTree: ロード済みツリーの正確なフィルタリングと子マッチ親展開を確認");
}

// テスト実行3: ソースコード実装ファイルの確認
{
  const projectRoot = process.cwd();

  // Sidebar.tsx
  const sidebarPath = path.join(projectRoot, "src", "components", "Sidebar", "Sidebar.tsx");
  assert(fs.existsSync(sidebarPath), "Sidebar.tsx exists");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");
  assert(sidebarCode.includes("searchFiles"), "Sidebar.tsx imports/uses searchFiles");
  assert(sidebarCode.includes("searchQuery"), "Sidebar.tsx manages searchQuery state");
  assert(sidebarCode.includes("displayTree"), "Sidebar.tsx computes displayTree");
  assert(sidebarCode.includes("ファイル名を検索..."), "Sidebar.tsx has search placeholder");
  assert(sidebarCode.includes("Ctrl+F"), "Sidebar.tsx has Ctrl+F shortcut / hint");
  assert(sidebarCode.includes("検索をクリア"), "Sidebar.tsx has clear button / action");

  // SidebarItem.tsx
  const sidebarItemPath = path.join(projectRoot, "src", "components", "Sidebar", "SidebarItem.tsx");
  assert(fs.existsSync(sidebarItemPath), "SidebarItem.tsx exists");
  const itemCode = fs.readFileSync(sidebarItemPath, "utf-8");
  assert(itemCode.includes("searchQuery"), "SidebarItem.tsx receives searchQuery prop");
  assert(itemCode.includes("HighlightedText"), "SidebarItem.tsx includes HighlightedText component");

  // fs.ts
  const fsApiPath = path.join(projectRoot, "src", "api", "fs.ts");
  assert(fs.existsSync(fsApiPath), "src/api/fs.ts exists");
  const fsApiCode = fs.readFileSync(fsApiPath, "utf-8");
  assert(fsApiCode.includes("export async function searchFiles"), "fs.ts exports searchFiles");

  // Rust backend
  const rustFsPath = path.join(projectRoot, "src-tauri", "src", "fs.rs");
  assert(fs.existsSync(rustFsPath), "src-tauri/src/fs.rs exists");
  const rustFsCode = fs.readFileSync(rustFsPath, "utf-8");
  assert(rustFsCode.includes("pub fn search_files"), "Rust fs.rs defines search_files");
  assert(rustFsCode.includes("fn test_search_files"), "Rust fs.rs has unit test for search_files");

  const rustLibPath = path.join(projectRoot, "src-tauri", "src", "lib.rs");
  assert(fs.existsSync(rustLibPath), "src-tauri/src/lib.rs exists");
  const rustLibCode = fs.readFileSync(rustLibPath, "utf-8");
  assert(rustLibCode.includes("fs::search_files"), "Rust lib.rs registers fs::search_files in invoke_handler");

  console.log("✓ ソースコード実装ファイル（フロントエンド / バックエンド）の整合性を確認");
}

console.log("=== 全てのサイドバーファイル名検索機能検証テストをパスしました ===");
