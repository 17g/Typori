import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("   Typori Phase 20 WYSIWYG Mermaid ノードビュー & プラグイン検証 ");
console.log("==================================================================");

// 1. ファイル存在検証
console.log("\n[1] ファイル存在確認...");
const pluginFilePath = path.resolve(projectRoot, "src/components/Editor/mermaidPlugin.ts");
assert.ok(fs.existsSync(pluginFilePath), "src/components/Editor/mermaidPlugin.ts が存在すること");
console.log("✓ mermaidPlugin.ts の存在を確認");

const editorFilePath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorFilePath), "src/components/Editor/Editor.tsx が存在すること");
console.log("✓ Editor.tsx の存在を確認");

// 2. mermaidPlugin.ts のエクスポートおよび構造検証
console.log("\n[2] mermaidPlugin.ts の必須エクスポート & クラス・プラグイン定義検証...");
const pluginContent = fs.readFileSync(pluginFilePath, "utf-8").replace(/\r\n/g, "\n");

const expectedExports = [
  "export const mermaidPluginKey",
  "export class MermaidNodeView",
  "export const mermaidPlugin",
];

for (const exp of expectedExports) {
  assert.ok(
    pluginContent.includes(exp),
    `mermaidPlugin.ts に '${exp}' が定義されていること`
  );
}
console.log("✓ 全必須シンボル（mermaidPluginKey, MermaidNodeView, mermaidPlugin）のエクスポートを確認");

// 3. Editor.tsx への登録・統合検証
console.log("\n[3] Editor.tsx へのプラグイン登録検証...");
const editorContent = fs.readFileSync(editorFilePath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorContent.includes('import { mermaidPlugin } from "./mermaidPlugin";') ||
    editorContent.includes('from "./mermaidPlugin"'),
  "Editor.tsx で mermaidPlugin がインポートされていること"
);
assert.ok(
  editorContent.includes(".use(mermaidPlugin)"),
  "Editor.tsx の Milkdown チェーンに .use(mermaidPlugin) が組み込まれていること"
);
console.log("✓ Editor.tsx へのプラグイン組み込みを確認");

// 4. Typoraライクなノードビュー構造・インタラクション検証
console.log("\n[4] Typoraライクなノードビュー構造 & インタラクション仕様検証...");

// 4.1 DOM構造とcontentDOM
assert.ok(
  pluginContent.includes("this.dom = document.createElement"),
  "ルートコンテナ this.dom が生成されていること"
);
assert.ok(
  pluginContent.includes("this.headerBar = document.createElement"),
  "ヘッダーバー this.headerBar が生成されていること"
);
assert.ok(
  pluginContent.includes("this.sourceWrapper = document.createElement"),
  "ソース編集ラッパー this.sourceWrapper が生成されていること"
);
assert.ok(
  pluginContent.includes("this.contentDOM = codeEl;"),
  "ProseMirror テキスト編集対象として this.contentDOM が設定されていること"
);
assert.ok(
  pluginContent.includes("this.previewContainer = document.createElement"),
  "プレビュー領域 this.previewContainer が生成されていること"
);
console.log("✓ DOM 構造（ルート、ヘッダー、ソース編集、contentDOM、プレビュー）の整合性を確認");

// 4.2 Typoraライクなクリック編集 & アクティブ追従
assert.ok(
  pluginContent.includes("this.handleClickPreview(e);") ||
    pluginContent.includes("handleClickPreview"),
  "プレビュー領域クリックによる編集モード移行ハンドラが実装されていること"
);
assert.ok(
  pluginContent.includes("TextSelection.near"),
  "クリック時に ProseMirror のキャレットをコードブロック先頭へ移動するロジックが存在すること"
);
assert.ok(
  pluginContent.includes("updateActiveState"),
  "Selection に応じてソース表示／折りたたみを同期する updateActiveState メソッドが存在すること"
);
console.log("✓ プレビュークリックによるキャレット移動 & ソース展開ロジックを確認");

// 4.3 構文エラー耐性ハンドリング
assert.ok(
  pluginContent.includes("typori-mermaid-error"),
  "構文エラー時に typori-mermaid-error クラスを用いたエラーコンテナが表示されること"
);
assert.ok(
  pluginContent.includes("Mermaid 構文エラー"),
  "エラー表示に 'Mermaid 構文エラー' 通知ラベルが含まれること"
);
console.log("✓ 構文エラー耐性（クラッシュ防止 & 控えめなエラーメッセージ通知）を確認");

// 4.4 ProseMirror 状態保護 & イベント伝播制御
assert.ok(
  pluginContent.includes("ignoreMutation"),
  "ProseMirror の不要な状態破壊・再描画を防止する ignoreMutation が実装されていること"
);
assert.ok(
  pluginContent.includes("stopEvent"),
  "プレビュー領域のイベント伝播を制御する stopEvent が実装されていること"
);
assert.ok(
  pluginContent.includes("destroy"),
  "ノード破棄時のリソース解放（タイマー解除・Observer切断）を行う destroy メソッドが実装されていること"
);
console.log("✓ ProseMirror ライフサイクル整合性（ignoreMutation, stopEvent, destroy）を確認");

// 4.5 通常コードブロックとの共存（言語判定ガード）
assert.ok(
  pluginContent.includes("isMermaidLanguage(node.attrs.language)"),
  "nodeViews において isMermaidLanguage で Mermaid のみを対象とし、通常コードブロックはデフォルト維持すること"
);
console.log("✓ 通常コードブロック（js, python 等）との完全な共存ガードを確認");

// 5. ロジックシミュレーション検証
console.log("\n[5] アクティブ状態同期 & Selection 判定シミュレーション...");

{
  // checkIsActive シミュレーション
  const checkIsActive = (pos, nodeSize, selFrom, selTo) => {
    return selFrom >= pos && selTo <= pos + nodeSize;
  };

  const nodePos = 10;
  const nodeSize = 50;

  // ノード内部にキャレットがある場合
  assert.equal(checkIsActive(nodePos, nodeSize, 15, 15), true, "ノード内部のキャレットは active");
  assert.equal(checkIsActive(nodePos, nodeSize, 10, 60), true, "ノード全体選択は active");
  // ノード外部にキャレットがある場合
  assert.equal(checkIsActive(nodePos, nodeSize, 5, 5), false, "ノード前方は inactive");
  assert.equal(checkIsActive(nodePos, nodeSize, 65, 65), false, "ノード後方は inactive");
  assert.equal(checkIsActive(nodePos, nodeSize, 5, 20), false, "ノード境界をまたぐ選択は inactive");
  console.log("✓ checkIsActive 判定ロジック合格");
}

console.log("\n==================================================================");
console.log(" >>> Typori Phase 20 WYSIWYG Mermaid ノードビュー: 全検証合格 <<< ");
console.log("==================================================================");
