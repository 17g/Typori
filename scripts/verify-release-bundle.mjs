/**
 * verify-release-bundle.mjs
 * リリースビルド生成成果物（実行ファイル・インストーラ）の存在と完全性検証スクリプト
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== リリースビルド生成成果物の完全性検証 ===");

const releaseDir = path.join(rootDir, "src-tauri", "target", "release");
const nsisBundlePath = path.join(releaseDir, "bundle", "nsis", "Typori_0.1.0_x64-setup.exe");
const msiBundlePath = path.join(releaseDir, "bundle", "msi", "Typori_0.1.0_x64_en-US.msi");
const exePath = path.join(releaseDir, "typori.exe");

// 1. 各成果物の存在確認
assert.ok(fs.existsSync(exePath), `リリースバイナリが存在すること: ${exePath}`);
assert.ok(fs.existsSync(nsisBundlePath), `NSISインストーラが存在すること: ${nsisBundlePath}`);
assert.ok(fs.existsSync(msiBundlePath), `MSIパッケージが存在すること: ${msiBundlePath}`);

// 2. サイズ確認 (最低1MB以上)
const exeStat = fs.statSync(exePath);
const nsisStat = fs.statSync(nsisBundlePath);
const msiStat = fs.statSync(msiBundlePath);

console.log(`- typori.exe: ${(exeStat.size / (1024 * 1024)).toFixed(2)} MB (${exeStat.size.toLocaleString()} bytes)`);
console.log(`- NSIS Setup: ${(nsisStat.size / (1024 * 1024)).toFixed(2)} MB (${nsisStat.size.toLocaleString()} bytes)`);
console.log(`- MSI Setup:  ${(msiStat.size / (1024 * 1024)).toFixed(2)} MB (${msiStat.size.toLocaleString()} bytes)`);

assert.ok(exeStat.size > 1024 * 1024, "typori.exe のサイズが1MB以上であること");
assert.ok(nsisStat.size > 1024 * 1024, "NSISインストーラのサイズが1MB以上であること");
assert.ok(msiStat.size > 1024 * 1024, "MSIインストーラのサイズが1MB以上であること");

// 3. SHA-256 チェックサム計算
function calculateSha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

console.log("\n--- SHA-256 チェックサム ---");
console.log(`- typori.exe: ${calculateSha256(exePath)}`);
console.log(`- NSIS Setup: ${calculateSha256(nsisBundlePath)}`);
console.log(`- MSI Setup:  ${calculateSha256(msiBundlePath)}`);

console.log("\n=== リリース成果物検証: 全項目合格 ===");
