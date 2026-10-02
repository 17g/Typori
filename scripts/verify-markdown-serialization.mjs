import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== Milkdown Markdown シリアライズフォーマット統一検証 ===");

// 1. Editor.tsx の静的解析
console.log("1. Editor.tsx の remarkStringifyOptionsCtx 設定検証...");
const editorFilePath = path.join(projectRoot, "src", "components", "Editor", "Editor.tsx");
assert.ok(fs.existsSync(editorFilePath), "src/components/Editor/Editor.tsx が存在すること");
const editorSource = fs.readFileSync(editorFilePath, "utf-8");

assert.ok(
  editorSource.includes("remarkStringifyOptionsCtx"),
  "Editor.tsx で remarkStringifyOptionsCtx がインポートされていること"
);

assert.ok(
  editorSource.includes("ctx.update(remarkStringifyOptionsCtx") ||
  editorSource.includes("ctx.set(remarkStringifyOptionsCtx"),
  "Editor.make().config() 内で remarkStringifyOptionsCtx が設定されていること"
);

assert.ok(
  /bullet:\s*["']-["']/.test(editorSource),
  '箇条書き記号として bullet: "-" が設定されていること'
);

assert.ok(
  /rule:\s*["']-["']/.test(editorSource),
  '水平線記号として rule: "-" が設定されていること'
);

assert.ok(
  /ruleRepetition:\s*3/.test(editorSource),
  "水平線の記号の繰り返し数として ruleRepetition: 3 が設定されていること"
);

assert.ok(
  /ruleSpaces:\s*false/.test(editorSource),
  "水平線のスペースなしとして ruleSpaces: false が設定されていること"
);

console.log("✓ Editor.tsx の静的解析検証に合格");

// 2. unified + remark-parse + remark-stringify によるシリアライズ動作検証
console.log("2. remark-stringify による Markdown 出力フォーマット検証...");

const pnpmDir = path.resolve(projectRoot, "node_modules/.pnpm");
const dirs = fs.readdirSync(pnpmDir);

const unifiedDir = dirs.find((d) => d.startsWith("unified@"));
const remarkParseDir = dirs.find((d) => d.startsWith("remark-parse@"));
const remarkStringifyDir = dirs.find((d) => d.startsWith("remark-stringify@"));

assert.ok(unifiedDir, "unified パッケージが存在すること");
assert.ok(remarkParseDir, "remark-parse パッケージが存在すること");
assert.ok(remarkStringifyDir, "remark-stringify パッケージが存在すること");

const unifiedPath = path.join(pnpmDir, unifiedDir, "node_modules/unified/index.js");
const remarkParsePath = path.join(pnpmDir, remarkParseDir, "node_modules/remark-parse/index.js");
const remarkStringifyPath = path.join(pnpmDir, remarkStringifyDir, "node_modules/remark-stringify/index.js");

const { unified } = await import(pathToFileURL(unifiedPath).href);
const remarkParse = (await import(pathToFileURL(remarkParsePath).href)).default;
const remarkStringify = (await import(pathToFileURL(remarkStringifyPath).href)).default;

// 設定した remark-stringify オプション
const stringifyOptions = {
  bullet: "-",
  bulletOther: "*",
  rule: "-",
  ruleRepetition: 3,
  ruleSpaces: false,
};

const processor = unified().use(remarkParse).use(remarkStringify, stringifyOptions);

// テスト入力 1: アスタリスクによるリストと水平線
const input1 = `* 項目 1
* 項目 2
  * 子項目 A
  * 子項目 B

***
`;

const output1 = String(processor.processSync(input1));

assert.ok(
  output1.includes("- 項目 1"),
  "アスタリスク記号のリストがハイフン記号 '-' にシリアライズされること"
);
assert.ok(
  output1.includes("- 項目 2"),
  "2番目のリスト項目もハイフン記号 '-' にシリアライズされること"
);
assert.ok(
  output1.includes("- 子項目 A") || output1.includes("  - 子項目 A"),
  "ネストした子項目もハイフン記号 '-' にシリアライズされること"
);
assert.ok(
  output1.includes("---"),
  "水平線が '---' にシリアライズされること"
);
assert.ok(
  !output1.includes("***"),
  "水平線に '***' が残っていないこと"
);

// テスト入力 2: プラス記号によるリストとアンダースコア水平線
const input2 = `+ リスト項目
___
`;
const output2 = String(processor.processSync(input2));

assert.ok(
  output2.includes("- リスト項目"),
  "プラス記号のリストも統一ハイフン '-' にシリアライズされること"
);
assert.ok(
  output2.includes("---"),
  "アンダースコア水平線も '---' に統一シリアライズされること"
);

console.log("✓ remark-stringify による Markdown 出力フォーマット検証に合格");
console.log("=== 全検証項目に合格しました ===");
