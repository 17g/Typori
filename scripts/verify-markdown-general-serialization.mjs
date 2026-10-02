import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== Markdown 一般化シリアライズ検証 (要修正3項目 & 記法統一) ===");

// 1. Editor.tsx の静的解析検証
console.log("1. Editor.tsx の remarkStringifyOptionsCtx 設定とカスタムハンドラーの静的解析検証...");
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

// 要修正①: 番号付きリスト「数字.」連番形式
assert.ok(
  /bulletOrdered:\s*["']\.["']/.test(editorSource),
  '番号付きリストのデリミタとして bulletOrdered: "." が設定されていること'
);
assert.ok(
  /incrementListMarker:\s*true/.test(editorSource),
  "番号付きリストの連番インクリメントとして incrementListMarker: true が設定されていること"
);

// 要修正②: 連続箇条書き「-」維持（カスタム list ハンドラー）
assert.ok(
  /bullet:\s*["']-["']/.test(editorSource),
  '箇条書き記号として bullet: "-" が設定されていること'
);
assert.ok(
  /handlers:\s*\{[\s\S]*?list:\s*\(/.test(editorSource),
  "handlers 内にカスタム list ハンドラーが実装されていること"
);
assert.ok(
  editorSource.includes("state.bulletCurrent = bullet"),
  "カスタム list ハンドラー内で bulletCurrent の交代が抑止されていること"
);

// 要修正③: URL同一リンク「[URL](URL)」維持
assert.ok(
  /resourceLink:\s*true/.test(editorSource),
  "URL同一リンクを [URL](URL) 形式で維持する resourceLink: true が設定されていること"
);

// 水平線: --- 統一
assert.ok(
  /rule:\s*["']-["']/.test(editorSource),
  '水平線記号として rule: "-" が設定されていること'
);
assert.ok(
  /ruleRepetition:\s*3/.test(editorSource),
  "水平線の繰り返し数として ruleRepetition: 3 が設定されていること"
);
assert.ok(
  /ruleSpaces:\s*false/.test(editorSource),
  "水平線のスペースなしとして ruleSpaces: false が設定されていること"
);

console.log("✓ Editor.tsx の静的解析検証にすべて合格");

// 2. unified + remark-parse + remark-stringify による実シリアライズ動作検証
console.log("2. remark-stringify による Markdown 出力フォーマット動作検証...");

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

// Editor.tsx と完全に同一の remark-stringify オプション
const stringifyOptions = {
  bullet: "-",
  bulletOther: "*",
  bulletOrdered: ".",
  incrementListMarker: true,
  resourceLink: true,
  rule: "-",
  ruleRepetition: 3,
  ruleSpaces: false,
  handlers: {
    list: (node, _parent, state, info) => {
      const exit = state.enter("list");
      const bulletCurrent = state.bulletCurrent;
      const bullet = node.ordered
        ? (state.options.bulletOrdered || ".")
        : (state.options.bullet || "-");

      state.bulletCurrent = bullet;
      const value = state.containerFlow(node, info);
      state.bulletLastUsed = bullet;
      state.bulletCurrent = bulletCurrent;
      exit();
      return value;
    },
  },
};

const processor = unified().use(remarkParse).use(remarkStringify, stringifyOptions);

// --- 検証①: 番号付きリストの常に「数字.」維持 ---
console.log("  2-1. 番号付きリストの連番「数字.」維持検証...");
const orderedInput1 = `1. 第一項目
1. 第二項目
1. 第三項目
`;
const orderedOutput1 = String(processor.processSync(orderedInput1));
assert.ok(
  orderedOutput1.includes("1. 第一項目"),
  "1番目の項目が '1. ' で出力されること"
);
assert.ok(
  orderedOutput1.includes("2. 第二項目"),
  "2番目の項目が '2. ' でインクリメント出力されること"
);
assert.ok(
  orderedOutput1.includes("3. 第三項目"),
  "3番目の項目が '3. ' でインクリメント出力されること"
);

// カッコ形式や混在からの正規化
const orderedInput2 = `1) 始まり
2) つぎ
3) おわり
`;
const orderedOutput2 = String(processor.processSync(orderedInput2));
assert.ok(
  orderedOutput2.includes("1. 始まり") && orderedOutput2.includes("2. つぎ") && orderedOutput2.includes("3. おわり"),
  "カッコ形式の番号付きリストも '1. ', '2. ', '3. ' のピリオド形式に正規化されること"
);
assert.ok(
  !orderedOutput2.includes("1)"),
  "出力に '1)' が含まれないこと"
);
console.log("  ✓ 番号付きリストの連番「数字.」維持検証に合格");

// --- 検証②: 連続箇条書きの「-」維持（マーカー交代抑止） ---
console.log("  2-2. 連続箇条書きブロック間のハイフン「-」維持検証...");

// 連続する2つの箇条書きリスト（通常の remark-stringify では2つ目が '*' になる）
const adjacentListMarkdown = `- リスト1 項目A
- リスト1 項目B

- リスト2 項目A
- リスト2 項目B
`;

// ASTで直接2つの連続リストを作成してシリアライズ挙動を厳密検証
const listAst = {
  type: "root",
  children: [
    {
      type: "list",
      ordered: false,
      children: [
        {
          type: "listItem",
          children: [{ type: "paragraph", children: [{ type: "text", value: "ブロック1 項目1" }] }],
        },
        {
          type: "listItem",
          children: [{ type: "paragraph", children: [{ type: "text", value: "ブロック1 項目2" }] }],
        },
      ],
    },
    {
      type: "list",
      ordered: false,
      children: [
        {
          type: "listItem",
          children: [{ type: "paragraph", children: [{ type: "text", value: "ブロック2 項目1" }] }],
        },
        {
          type: "listItem",
          children: [{ type: "paragraph", children: [{ type: "text", value: "ブロック2 項目2" }] }],
        },
      ],
    },
  ],
};

const adjacentOutput = String(processor.stringify(listAst));
assert.ok(
  adjacentOutput.includes("- ブロック1 項目1"),
  "ブロック1の項目1がハイフン '-' であること"
);
assert.ok(
  adjacentOutput.includes("- ブロック1 項目2"),
  "ブロック1の項目2がハイフン '-' であること"
);
assert.ok(
  adjacentOutput.includes("- ブロック2 項目1"),
  "ブロック2の項目1がアスタリスクに交代せずハイフン '-' を維持していること"
);
assert.ok(
  adjacentOutput.includes("- ブロック2 項目2"),
  "ブロック2の項目2がアスタリスクに交代せずハイフン '-' を維持していること"
);
assert.ok(
  !adjacentOutput.includes("* ブロック2"),
  "連続リストで '*' への交代が発生していないこと"
);

// カスタムハンドラーなしの場合との対比検証（カスタムハンドラーの効果を直接検証）
const processorWithoutCustomList = unified().use(remarkParse).use(remarkStringify, {
  ...stringifyOptions,
  handlers: undefined,
});
const outputWithoutCustomList = String(processorWithoutCustomList.stringify(listAst));
assert.ok(
  outputWithoutCustomList.includes("* ブロック2"),
  "カスタムハンドラーがないデフォルトでは連続リストの2つ目が '*' に自動交代すること"
);
console.log("  ✓ 連続箇条書きブロック間のハイフン「-」維持検証に合格");

// --- 検証③: URL同一リンクの「[URL](URL)」維持 ---
console.log("  2-3. URL同一リンクの [URL](URL) リソースリンク形式維持検証...");
const linkInput = `[https://github.com/](https://github.com/)

[https://example.com/docs/guide](https://example.com/docs/guide)

[通常リンクテキスト](https://example.com)
`;
const linkOutput = String(processor.processSync(linkInput));

assert.ok(
  linkOutput.includes("[https://github.com/](https://github.com/)"),
  "URLとテキストが同一のリンクが [https://github.com/](https://github.com/) 形式で出力されること"
);
assert.ok(
  !linkOutput.includes("<https://github.com/>"),
  "<URL> への短縮自動リンク変換が抑止されていること"
);
assert.ok(
  linkOutput.includes("[https://example.com/docs/guide](https://example.com/docs/guide)"),
  "パス付きURL同一リンクも [URL](URL) 形式で維持されること"
);
assert.ok(
  linkOutput.includes("[通常リンクテキスト](https://example.com)"),
  "別名リンクテキストも通常の [テキスト](URL) 形式で出力されること"
);

// resourceLink: false の場合との対比検証（resourceLink: true の効果を直接検証）
const processorWithoutResourceLink = unified().use(remarkParse).use(remarkStringify, {
  ...stringifyOptions,
  resourceLink: false,
});
const outputWithoutResourceLink = String(processorWithoutResourceLink.processSync(linkInput));
assert.ok(
  outputWithoutResourceLink.includes("<https://github.com/>"),
  "resourceLink: false では同一URLリンクが <URL> に短縮されること"
);
assert.ok(
  !outputWithoutResourceLink.includes("[https://github.com/](https://github.com/)"),
  "resourceLink: false では [URL](URL) 形式が維持されないこと"
);
console.log("  ✓ URL同一リンクの [URL](URL) リソースリンク形式維持検証に合格");

// --- 検証④: 水平線の「---」統一 ---
console.log("  2-4. 水平線の '---' 統一検証...");
const ruleInput = `***
___
---
`;
const ruleOutput = String(processor.processSync(ruleInput));
const ruleMatches = ruleOutput.match(/^---$/gm) || [];
assert.ok(
  ruleMatches.length >= 3,
  "すべての水平線が '---' に統一シリアライズされること"
);
assert.ok(
  !ruleOutput.includes("***") && !ruleOutput.includes("___"),
  "'***' や '___' が残っていないこと"
);
console.log("  ✓ 水平線の '---' 統一検証に合格");

console.log("\n=== Markdown 一般化シリアライズ全検証項目に合格しました ===");
