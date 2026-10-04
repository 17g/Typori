import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== ウィンドウクローズ制御（Rust側 CloseRequested インターセプト & 双方向ハンドシェイク）検証 ===");

// 1. Rust バックエンド (src-tauri/src/lib.rs) の実装検証
const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
const libRsContent = fs.readFileSync(libRsPath, "utf-8");

assert.ok(
  libRsContent.includes("use tauri::Emitter;"),
  "lib.rs で use tauri::Emitter; がインポートされていること"
);
assert.ok(
  libRsContent.includes(".on_window_event("),
  "lib.rs で on_window_event が登録されていること"
);
assert.ok(
  libRsContent.includes("tauri::WindowEvent::CloseRequested"),
  "lib.rs で CloseRequested イベントがハンドリングされていること"
);
assert.ok(
  libRsContent.includes("api.prevent_close();"),
  "lib.rs で api.prevent_close() が呼び出されていること"
);
assert.ok(
  libRsContent.includes('window.emit("window:close_requested", ())'),
  "lib.rs で window.emit(\"window:close_requested\", ()) が発行されていること"
);
console.log("✓ Rust側 CloseRequested インターセプト & フロントエンド通知の実装を確認");

// 2. フロントエンド (src/App.tsx) の実装検証
const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");

assert.ok(
  appTsxContent.includes('listen("window:close_requested"'),
  'App.tsx で listen("window:close_requested") が購読されていること'
);
assert.ok(
  appTsxContent.includes("executeCloseWorkflow"),
  "App.tsx で executeCloseWorkflow ハンドシェイク関数が実装されていること"
);
assert.ok(
  appTsxContent.includes("const unsaved = getUnsavedDocuments();"),
  "クローズハンドラ内で getUnsavedDocuments() が呼び出されていること"
);
assert.ok(
  appTsxContent.includes("await appWindow.destroy();"),
  "未保存確認後または未保存なし時に appWindow.destroy() が実行されること"
);
console.log("✓ フロントエンド側 window:close_requested 受信 & 未保存確認ハンドシェイクの実装を確認");

console.log("\nすべての検証項目に合格しました！");
