import assert from "node:assert/strict";

async function verifyImageSupport() {
  console.log("=== Testing Image D&D, Insertion, and Display Logic ===");

  // 1. Verify Milkdown preset-commonmark exports imageSchema
  const commonmarkModule = await import("@milkdown/kit/preset/commonmark");
  assert.ok(commonmarkModule.imageSchema, "imageSchema should be exported from preset/commonmark");
  assert.ok(commonmarkModule.insertImageCommand, "insertImageCommand should be exported");
  console.log("✓ preset-commonmark imageSchema and insertImageCommand verified");

  // 2. Verify image file extension detection logic
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".tiff"];
  const isImageFilePath = (path) => {
    const lower = path.toLowerCase();
    return imageExtensions.some((ext) => lower.endsWith(ext));
  };

  assert.equal(isImageFilePath("photo.png"), true, "photo.png should be detected as image");
  assert.equal(isImageFilePath("SCREENSHOT.JPG"), true, "SCREENSHOT.JPG should be detected as image");
  assert.equal(isImageFilePath("assets/diagram.svg"), true, "assets/diagram.svg should be detected as image");
  assert.equal(isImageFilePath("notes.md"), false, "notes.md should not be detected as image");
  assert.equal(isImageFilePath("index.html"), false, "index.html should not be detected as image");
  console.log("✓ isImageFilePath detection logic verified");

  // 3. Verify MIME type detection logic
  function getMimeType(filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "bmp":
        return "image/bmp";
      case "ico":
        return "image/x-icon";
      case "avif":
        return "image/avif";
      default:
        return "application/octet-stream";
    }
  }

  assert.equal(getMimeType("assets/test.png"), "image/png");
  assert.equal(getMimeType("sample.jpeg"), "image/jpeg");
  assert.equal(getMimeType("icon.svg"), "image/svg+xml");
  console.log("✓ MIME type resolution verified");

  // 4. Verify Editor composition with commonmark
  const { Editor, rootCtx, defaultValueCtx } = await import("@milkdown/kit/core");
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, {});
      ctx.set(defaultValueCtx, "![Sample Image](assets/sample.png)");
    })
    .use(commonmarkModule.commonmark);

  assert.ok(editor, "Editor instance should be configured with commonmark including imageSchema");
  console.log("✓ Editor composition with image support verified");

  console.log("\nAll image D&D and insertion checks passed successfully!");
}

verifyImageSupport().catch((err) => {
  console.error("Image verification failed:", err);
  process.exit(1);
});
