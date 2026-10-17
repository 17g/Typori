/**
 * verify-release-config.mjs
 * リリースビルド設定・バージョン・アイコンアセットの整合性検証スクリプト
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== リリースビルド設定 & バージョン整合性検証 ===");

// 1. 各設定ファイルの読み込み
const packageJsonPath = path.join(rootDir, "package.json");
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");

assert.ok(fs.existsSync(packageJsonPath), "package.json が存在すること");
assert.ok(fs.existsSync(tauriConfPath), "src-tauri/tauri.conf.json が存在すること");
assert.ok(fs.existsSync(cargoTomlPath), "src-tauri/Cargo.toml が存在すること");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");

// 2. バージョン整合性チェック
const pkgVersion = packageJson.version;
const tauriVersion = tauriConf.version;
const cargoVersionMatch = cargoToml.match(/\[package\][\s\S]*?version\s*=\s*"([^"]+)"/);
assert.ok(cargoVersionMatch, "Cargo.toml 内に [package] version が存在すること");
const cargoVersion = cargoVersionMatch[1];

console.log(`- package.json version: ${pkgVersion}`);
console.log(`- tauri.conf.json version: ${tauriVersion}`);
console.log(`- Cargo.toml version: ${cargoVersion}`);

assert.equal(pkgVersion, tauriVersion, "package.json と tauri.conf.json のバージョンが一致すること");
assert.equal(pkgVersion, cargoVersion, "package.json と Cargo.toml のバージョンが一致すること");
console.log("✓ バージョン番号が完全に一致しています");

// 3. アプリケーション識別情報・バンドル設定
assert.equal(tauriConf.productName, "Typori", "productName が Typori であること");
assert.equal(tauriConf.identifier, "com.typori.editor", "identifier が com.typori.editor であること");
assert.equal(tauriConf.bundle?.active, true, "bundle.active が true であること");
assert.equal(tauriConf.build?.beforeBuildCommand, "pnpm build", "beforeBuildCommand が pnpm build であること");
console.log("✓ アプリケーション識別情報・バンドル設定が正常です");

// 4. アイコンアセットの存在チェック
const iconList = tauriConf.bundle?.icon ?? [];
assert.ok(iconList.length > 0, "bundle.icon が設定されていること");
for (const iconRelPath of iconList) {
  const iconFullPath = path.join(rootDir, "src-tauri", iconRelPath);
  assert.ok(fs.existsSync(iconFullPath), `アイコンファイルが存在すること: ${iconRelPath}`);
}
console.log(`✓ 全 ${iconList.length} 件の指定アイコンファイルが存在します`);

// 5. Cargo.toml リリースプロファイル最適化設定
assert.ok(cargoToml.includes("[profile.release]"), "[profile.release] 設定が存在すること");
assert.ok(cargoToml.includes("opt-level = 3"), "opt-level = 3 が設定されていること");
assert.ok(cargoToml.includes("lto = true"), "lto = true が設定されていること");
console.log("✓ Cargo.toml のリリース最適化プロファイル設定が正常です");

// 6. ビルドスクリプトの存在
assert.ok(packageJson.scripts?.["build:release"], "package.json に build:release スクリプトが存在すること");
console.log("✓ package.json に build:release スクリプトが存在します");

console.log("\n=== リリース設定検証: 全項目合格 ===");
