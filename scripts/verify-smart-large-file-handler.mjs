import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Typori Phase 25 Task 93 大容量ファイル検知 & 高速オープン連携検証  ");
console.log("==================================================================");

// [Step 1] src/utils/text.ts のエクスポートおよびロジック検証
console.log("\n[1] src/utils/text.ts の analyzeContentSize および判定ロジック検証...");
const textTsPath = path.resolve(projectRoot, "src/utils/text.ts");
assert.ok(fs.existsSync(textTsPath), "src/utils/text.ts が存在すること");
const textTsContent = fs.readFileSync(textTsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  textTsContent.includes("export function analyzeContentSize("),
  "analyzeContentSize 関数がエクスポートされていること"
);
assert.ok(
  textTsContent.includes("export interface LargeFileInfo"),
  "LargeFileInfo インターフェースが定義・エクスポートされていること"
);

// 動的インポートによる analyzeContentSize の実動作テスト
const { analyzeContentSize, isLargeContent, LARGE_FILE_SIZE_THRESHOLD, LARGE_FILE_LINE_THRESHOLD } =
  await import("../src/utils/text.ts");

// 境界値テスト: null, undefined, 空文字
assert.deepEqual(
  analyzeContentSize(null),
  { isLarge: false, sizeBytes: 0, sizeKB: 0, lineCount: 0 },
  "null の場合はすべてゼロで isLarge: false"
);
assert.deepEqual(
  analyzeContentSize(undefined),
  { isLarge: false, sizeBytes: 0, sizeKB: 0, lineCount: 0 },
  "undefined の場合はすべてゼロで isLarge: false"
);
assert.deepEqual(
  analyzeContentSize(""),
  { isLarge: false, sizeBytes: 0, sizeKB: 0, lineCount: 0 },
  "空文字の場合はすべてゼロで isLarge: false"
);

// 通常ファイル（数行、数百バイト）
const smallMd = "# Hello World\n\nThis is a test markdown file.\n";
const smallResult = analyzeContentSize(smallMd);
assert.equal(smallResult.isLarge, false, "通常ファイルは isLarge: false");
assert.equal(smallResult.lineCount, 4, "行数が正確にカウントされること (4行)");
assert.equal(smallResult.sizeBytes, smallMd.length, "バイト数が一致すること");

// 300KB の巨大コンテンツ
const largeSizeMd = "A".repeat(300 * 1024);
const largeSizeResult = analyzeContentSize(largeSizeMd);
assert.equal(largeSizeResult.isLarge, true, "300KB のコンテンツは isLarge: true");
assert.equal(largeSizeResult.sizeKB, 300, "sizeKB が 300 であること");
assert.equal(largeSizeResult.lineCount, 1, "1行であること");

// 2000行の巨大コンテンツ
const lines2000Md = Array.from({ length: 2000 }, (_, i) => `Line ${i + 1}`).join("\n");
const lines2000Result = analyzeContentSize(lines2000Md);
assert.equal(lines2000Result.isLarge, true, "2000行のコンテンツは isLarge: true");
assert.equal(lines2000Result.lineCount, 2000, "lineCount が 2000 であること");

// 800KB / 5000行の大規模ファイルベンチマーク
const benchMd = Array.from(
  { length: 5000 },
  (_, i) =>
    `## Benchmark Heading ${i + 1}\nParagraph text for stress test line ${i + 1}. Adding extra repeated words to ensure total length reliably exceeds eight hundred kilobytes (800KB) in Typori benchmark suite.`
).join("\n\n");
const benchResult = analyzeContentSize(benchMd);
assert.equal(benchResult.isLarge, true, "800KB/5000行のコンテンツは isLarge: true");
assert.ok(benchResult.sizeKB >= 800, `sizeKB が 800 以上であること (実測: ${benchResult.sizeKB}KB)`);
assert.ok(benchResult.lineCount >= 5000, `lineCount が 5000 以上であること (実測: ${benchResult.lineCount}行)`);

console.log("✓ analyzeContentSize および各種境界値・大容量判定が正確に機能することを確認");

// [Step 2] src/App.tsx の静的コード構造検証
console.log("\n[2] src/App.tsx の Smart Large-File Handler 実装検証...");
const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

// LargeFileNotice インターフェース
assert.ok(
  appTsxContent.includes("export interface LargeFileNotice"),
  "LargeFileNotice インターフェースが定義・エクスポートされていること"
);
assert.ok(
  appTsxContent.includes("const [largeFileNotice, setLargeFileNotice] = useState<LargeFileNotice | null>(null);"),
  "largeFileNotice state が定義されていること"
);

// checkAndApplySmartLargeFileMode コールバック
assert.ok(
  appTsxContent.includes("const checkAndApplySmartLargeFileMode = useCallback("),
  "checkAndApplySmartLargeFileMode コールバックが定義されていること"
);
assert.ok(
  appTsxContent.includes("if (sizeInfo.isLarge) {"),
  "checkAndApplySmartLargeFileMode 内で sizeInfo.isLarge 判定が行われていること"
);
assert.ok(
  appTsxContent.includes("isSourceModeRef.current = true;"),
  "大容量判定時に isSourceModeRef.current = true に同期更新されること"
);
assert.ok(
  appTsxContent.includes("setIsSourceMode(true);"),
  "大容量判定時に setIsSourceMode(true) が呼び出され即時高速オープンされること"
);

// initialize() での適用確認
assert.ok(
  appTsxContent.includes("checkAndApplySmartLargeFileMode(targetFilePath, fileName, content);"),
  "initialize() の初期ファイル読み込み時に checkAndApplySmartLargeFileMode が呼び出されていること"
);

// handleSelectFile での適用確認
const handleSelectFileMatches = appTsxContent.match(/checkAndApplySmartLargeFileMode\(entry\.path, fileName, content\);/g);
assert.ok(
  handleSelectFileMatches && handleSelectFileMatches.length >= 2,
  "handleSelectFile の単一ファイルモードおよび複数タブモード双方で checkAndApplySmartLargeFileMode が呼び出されていること"
);

// handleSelectTab での大容量判定
assert.ok(
  appTsxContent.includes("const sizeInfo = analyzeContentSize(normTargetContent);"),
  "handleSelectTab で切り替え先タブの analyzeContentSize が呼び出されていること"
);

// handleCloseTab での大容量判定
assert.ok(
  appTsxContent.includes("const sizeInfo = analyzeContentSize(normNextContent);"),
  "handleCloseTab で次のアクティブタブの analyzeContentSize が呼び出されていること"
);

// UI 案内バナーの検証
assert.ok(
  appTsxContent.includes("{largeFileNotice && ("),
  "JSX に大容量ファイル案内バナーの条件付きレンダリングが存在すること"
);
assert.ok(
  appTsxContent.includes("大容量ファイル検知"),
  "案内バナーに「大容量ファイル検知」のラベルが含まれていること"
);
assert.ok(
  appTsxContent.includes("WYSIWYGで表示"),
  "案内バナーに WYSIWYG モードへの切替ボタンが含まれていること"
);
assert.ok(
  appTsxContent.includes("高速モード (ソース編集) に戻す"),
  "案内バナーに高速モード（ソース直接編集）への復帰ボタンが含まれていること"
);
assert.ok(
  appTsxContent.includes("onClick={() => setLargeFileNotice(null)}"),
  "案内バナーに閉じる (✕) ボタンが含まれていること"
);

console.log("✓ App.tsx の Smart Large-File Handler 静的構造・UIバナー・連携呼び出しを確認");

// [Step 3] Smart Large-File Handler 挙動のシミュレーション検証
console.log("\n[3] Smart Large-File Handler 動作シミュレーション検証...");

function simulateLargeFileHandler() {
  let isSourceMode = false;
  const isSourceModeRef = { current: false };
  let largeFileNotice = null;

  const checkAndApply = (filePath, fileName, content) => {
    const sizeInfo = analyzeContentSize(content);
    if (sizeInfo.isLarge) {
      isSourceModeRef.current = true;
      isSourceMode = true;
      largeFileNotice = {
        path: filePath,
        fileName,
        sizeKB: sizeInfo.sizeKB,
        lineCount: sizeInfo.lineCount,
      };
      return true;
    } else {
      largeFileNotice = null;
      return false;
    }
  };

  const switchMode = (mode) => {
    isSourceModeRef.current = mode;
    isSourceMode = mode;
  };

  const dismissNotice = () => {
    largeFileNotice = null;
  };

  return {
    getState: () => ({ isSourceMode, isSourceModeRef: isSourceModeRef.current, largeFileNotice }),
    checkAndApply,
    switchMode,
    dismissNotice,
  };
}

// シナリオ 1: 通常ファイルのオープン
{
  const sim = simulateLargeFileHandler();
  const opened = sim.checkAndApply("memo.md", "memo.md", "# Regular note\nContent\n");
  assert.equal(opened, false, "通常ファイルは高速モード強制フラグが false");
  const state = sim.getState();
  assert.equal(state.isSourceMode, false, "通常ファイルでは WYSIWYG モードが維持されること");
  assert.equal(state.largeFileNotice, null, "通常ファイルでは notice は null");
  console.log("✓ シナリオ 1 (通常ファイルオープン): WYSIWYGモード維持 & バナー非表示");
}

// シナリオ 2: 800KB / 5000行大容量ファイルのオープン
{
  const sim = simulateLargeFileHandler();
  const opened = sim.checkAndApply("huge.md", "huge.md", benchMd);
  assert.equal(opened, true, "大容量ファイルは高速モード強制フラグが true");
  const state = sim.getState();
  assert.equal(state.isSourceMode, true, "大容量ファイル読み込み時に直接編集モード（ソースモード）へ自動高速オープン");
  assert.equal(state.isSourceModeRef, true, "Ref も同期して true");
  assert.ok(state.largeFileNotice !== null, "大容量案内バナー情報が生成されること");
  assert.equal(state.largeFileNotice.fileName, "huge.md");
  assert.ok(state.largeFileNotice.sizeKB >= 800, `sizeKB >= 800 (${state.largeFileNotice.sizeKB}KB)`);
  assert.ok(state.largeFileNotice.lineCount >= 5000, `lineCount >= 5000 (${state.largeFileNotice.lineCount}行)`);

  // ユーザーがバナーから「WYSIWYGで表示」を押下
  sim.switchMode(false);
  assert.equal(sim.getState().isSourceMode, false, "ユーザー操作により WYSIWYG モードへの切り替えが可能");
  assert.ok(sim.getState().largeFileNotice !== null, "バナー案内は維持される");

  // ユーザーがバナーを閉じる
  sim.dismissNotice();
  assert.equal(sim.getState().largeFileNotice, null, "✕ ボタンでバナーが消去されること");
  console.log("✓ シナリオ 2 (800KB/5000行オープン): ソース直接編集モード自動高速オープン & バナー通知 & 双方向モード切替");
}

// シナリオ 3: 複数ファイル切替時のバナー状態整合性
{
  const sim = simulateLargeFileHandler();
  // 1. 巨大ファイルオープン
  sim.checkAndApply("doc_large.md", "doc_large.md", benchMd);
  assert.ok(sim.getState().largeFileNotice !== null, "大容量ファイルでバナー表示");

  // 2. 通常ファイルオープン
  sim.checkAndApply("small.md", "small.md", "# Small\n");
  assert.equal(sim.getState().largeFileNotice, null, "通常ファイルオープン時にバナーが自動消去されること");
  console.log("✓ シナリオ 3 (ファイル切替連携): 通常ファイル切替時のバナー自動消去");
}

console.log("\n==================================================================");
console.log("   >>> Task 93 Smart Large-File Handler: 全検証合格 <<<   ");
console.log("==================================================================");
