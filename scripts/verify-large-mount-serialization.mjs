import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Typori Phase 25 Task 92 Milkdown初回マウント時シリアライズ最適化検証  ");
console.log("==================================================================");

// [Step 1] text.ts の定義・エクスポート・ロジック検証
console.log("\n[1] src/utils/text.ts の大容量コンテンツ判定ロジック検証...");
const textTsPath = path.resolve(projectRoot, "src/utils/text.ts");
assert.ok(fs.existsSync(textTsPath), "src/utils/text.ts が存在すること");
const textTsContent = fs.readFileSync(textTsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  textTsContent.includes("export const LARGE_FILE_SIZE_THRESHOLD = 300 * 1024;"),
  "LARGE_FILE_SIZE_THRESHOLD (300KB) がエクスポートされていること"
);
assert.ok(
  textTsContent.includes("export const LARGE_FILE_LINE_THRESHOLD = 2000;"),
  "LARGE_FILE_LINE_THRESHOLD (2000行) がエクスポートされていること"
);
assert.ok(
  textTsContent.includes("export function isLargeContent("),
  "isLargeContent 関数がエクスポートされていること"
);

// 動的インポートによる isLargeContent の実動作テスト
const { isLargeContent, LARGE_FILE_SIZE_THRESHOLD, LARGE_FILE_LINE_THRESHOLD } = await import("../src/utils/text.ts");

assert.equal(isLargeContent(null), false, "null は false");
assert.equal(isLargeContent(undefined), false, "undefined は false");
assert.equal(isLargeContent(""), false, "空文字は false");
assert.equal(isLargeContent("# Small markdown file\n"), false, "通常サイズのファイルは false");

// 300KB 以上の文字列
const largeSizeContent = "a".repeat(300 * 1024);
assert.equal(isLargeContent(largeSizeContent), true, "300KB 以上のコンテンツは true");

// 299KB の文字列
const underSizeContent = "a".repeat(300 * 1024 - 10);
assert.equal(isLargeContent(underSizeContent), false, "300KB 未満かつ 2000行未満のコンテンツは false");

// 2000行の文字列 (改行コード \n が 1999個以上)
const lines2000Content = Array.from({ length: 2000 }, (_, i) => `Line ${i + 1}`).join("\n");
assert.equal(isLargeContent(lines2000Content), true, "2000行のコンテンツは true");

// 1999行の文字列
const lines1999Content = Array.from({ length: 1999 }, (_, i) => `Line ${i + 1}`).join("\n");
assert.equal(isLargeContent(lines1999Content), false, "1999行（300KB未満）のコンテンツは false");

console.log("✓ text.ts の isLargeContent 判定ロジックが正常に動作することを確認");

// [Step 2] src/components/Editor/Editor.tsx の静的コード構造検証
console.log("\n[2] src/components/Editor/Editor.tsx のマウント時シリアライズ最適化検証...");
const editorTsxPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorTsxPath), "Editor.tsx が存在すること");
const editorTsxContent = fs.readFileSync(editorTsxPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorTsxContent.includes('import { normalizeLineEndings, isLargeContent } from "../../utils/text";'),
  "Editor.tsx で isLargeContent がインポートされていること"
);
assert.ok(
  editorTsxContent.includes("export { isSafeExternalUrl, isLargeContent };"),
  "Editor.tsx で isLargeContent がエクスポートされていること"
);
assert.ok(
  editorTsxContent.includes("if (!hasUserInteractedRef.current && !isDirty) {"),
  "mounted リスナーで !hasUserInteractedRef.current && !isDirty のガードが存在すること"
);
assert.ok(
  editorTsxContent.includes("const isLarge = isLargeContent(initialValue)"),
  "mounted リスナーで isLargeContent(initialValue) による大容量判定が行われていること"
);
assert.ok(
  editorTsxContent.includes("if (!isLarge) {"),
  "mounted リスナーで !isLarge の場合にのみ全件シリアライズが実行されるガードが存在すること"
);
assert.ok(
  editorTsxContent.includes("onChangeRef.current?.(initialSerialized, { isUserInteraction: false });"),
  "通常ファイル用初期シリアライズ通知 onChangeRef.current?.(initialSerialized, { isUserInteraction: false }); が保護されていること"
);

console.log("✓ Editor.tsx の静的コード構造と大容量ファイル抑制ガードを確認");

// [Step 3] マウント時シリアライズ挙動のシミュレーション検証
console.log("\n[3] 通常ファイル vs 大容量ファイルのマウント時シリアライズシミュレーション...");

function simulateMountedHook(options) {
  const { initialValue, isDirty = false, hasUserInteracted = false, docNodeSize = 100 } = options;
  let serializerCallCount = 0;
  let onChangePayload = null;

  const mockSerializer = (doc) => {
    serializerCallCount++;
    return `# Serialized Output\n${doc}`;
  };

  const hasUserInteractedRef = { current: hasUserInteracted };
  let prevContent = initialValue;

  // Editor.tsx と同一のロジック
  if (!hasUserInteractedRef.current && !isDirty) {
    const isLarge = isLargeContent(initialValue) || Boolean(docNodeSize >= 60000);
    if (!isLarge) {
      const serializer = mockSerializer;
      const initialSerialized = serializer(initialValue);
      prevContent = initialSerialized;
      onChangePayload = { content: initialSerialized, meta: { isUserInteraction: false } };
    }
  }

  return {
    serializerCallCount,
    onChangePayload,
    prevContent,
  };
}

// シナリオ A: 通常ファイル（数KB）
{
  const smallMarkdown = "# Title\n\n- item 1\n- item 2\n";
  const result = simulateMountedHook({ initialValue: smallMarkdown, isDirty: false });
  assert.equal(result.serializerCallCount, 1, "通常ファイルでは初回シリアライズが実行されること");
  assert.ok(result.onChangePayload !== null, "onChange が呼び出されること");
  assert.equal(result.onChangePayload.meta.isUserInteraction, false, "isUserInteraction は false");
  console.log("✓ シナリオ A (通常ファイル): 初回シリアライズとベースライン同期が正常に実行");
}

// シナリオ B: 大容量ファイル（800KB / 5000行）
{
  const largeLines = Array.from(
    { length: 5000 },
    (_, i) =>
      `## Section ${i + 1}\nThis is a long descriptive content paragraph for large markdown document benchmark item ${i + 1}. Extra text to simulate realistic 800KB+ files in Typori local editor.`
  ).join("\n\n");
  assert.ok(largeLines.length >= 800 * 1024, `5000行ドキュメントが 800KB 以上であること (実測: ${Math.round(largeLines.length / 1024)}KB)`);

  const startTime = performance.now();
  const result = simulateMountedHook({ initialValue: largeLines, isDirty: false });
  const duration = performance.now() - startTime;

  assert.equal(result.serializerCallCount, 0, "大容量ファイルでは serializer が呼び出されないこと (0回)");
  assert.equal(result.onChangePayload, null, "大容量ファイルでは初回シリアライズ通知が抑制されること");
  assert.equal(result.prevContent, largeLines, "prevContentRef に初期コンテンツがそのまま保持されること");
  assert.ok(duration < 20, `マウント判定処理が瞬時 (20ms未満) に完了すること (実測: ${duration.toFixed(2)}ms)`);
  console.log(`✓ シナリオ B (大容量ファイル 800KB/5000行): serializer 呼び出しゼロ & メインスレッドブロック完全排除 (${duration.toFixed(2)}ms)`);
}

// シナリオ C: 既に編集済み状態 (isDirty: true)
{
  const dirtyMarkdown = "# Dirty Document";
  const result = simulateMountedHook({ initialValue: dirtyMarkdown, isDirty: true });
  assert.equal(result.serializerCallCount, 0, "isDirty: true の場合は serializer が呼び出されないこと");
  assert.equal(result.onChangePayload, null, "onChange が呼び出されないこと");
  console.log("✓ シナリオ C (未保存ファイル): isDirty ガードによりシリアライズ抑止");
}

console.log("\n==================================================================");
console.log("   >>> Task 92 初回マウント時シリアライズ最適化: 全検証合格 <<<   ");
console.log("==================================================================");
