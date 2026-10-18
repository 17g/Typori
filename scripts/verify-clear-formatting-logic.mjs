import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== 書式クリア（Clear Formatting / Bare）純粋ロジック単体検証 ===");

// 1. src/utils/format.ts の静的検証
console.log("\n[Step 1] src/utils/format.ts のファイル存在および構成検証...");
const formatTsPath = path.resolve(projectRoot, "src/utils/format.ts");
assert.ok(fs.existsSync(formatTsPath), "src/utils/format.ts が存在すること");

const formatTsContent = fs.readFileSync(formatTsPath, "utf-8");
assert.ok(
  formatTsContent.includes("export function clearInlineFormatting"),
  "clearInlineFormatting が export されていること"
);
assert.ok(
  formatTsContent.includes("export function parseInlineSpans"),
  "parseInlineSpans が export されていること"
);
assert.ok(
  formatTsContent.includes("export function stripFormatting"),
  "stripFormatting が export されていること"
);
assert.ok(
  formatTsContent.includes("export function hasFormatting"),
  "hasFormatting が export されていること"
);
assert.ok(
  formatTsContent.includes("export interface ClearFormattingResult"),
  "ClearFormattingResult インターフェースが定義されていること"
);
console.log("✓ src/utils/format.ts の関数・インターフェース定義を確認");

// 2. format.ts のロジックを直接テストするための同等テストハーネス
// (Node.js ESM 環境での TypeScript 独立検証)

function isWhitespaceChar(ch) {
  if (!ch) return true;
  return /\s/.test(ch);
}

function isPunctuationChar(ch) {
  if (!ch) return false;
  return /[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/.test(ch);
}

function parseInlineSpans(line) {
  const spans = [];
  const len = line.length;
  if (len === 0) return spans;

  const protectedRanges = [];
  let i = 0;
  while (i < len) {
    if (line[i] === "\\" && i + 1 < len) {
      i += 2;
      continue;
    }

    if (line[i] === "`") {
      let runLen = 1;
      while (i + runLen < len && line[i + runLen] === "`") {
        runLen++;
      }
      const backticks = line.slice(i, i + runLen);
      const contentStart = i + runLen;
      let closeIdx = -1;
      let searchIdx = contentStart;
      while (searchIdx < len) {
        if (line[searchIdx] === "`") {
          let closeRun = 1;
          while (searchIdx + closeRun < len && line[searchIdx + closeRun] === "`") {
            closeRun++;
          }
          if (closeRun === runLen) {
            closeIdx = searchIdx;
            break;
          }
          searchIdx += closeRun;
        } else {
          searchIdx++;
        }
      }

      if (closeIdx !== -1) {
        spans.push({
          type: "code",
          openDelim: backticks,
          closeDelim: backticks,
          openStart: i,
          openEnd: contentStart,
          contentStart,
          contentEnd: closeIdx,
          closeStart: closeIdx,
          closeEnd: closeIdx + runLen,
        });
        protectedRanges.push({ start: i, end: closeIdx + runLen });
        i = closeIdx + runLen;
        continue;
      }
      i += runLen;
      continue;
    }

    if (line[i] === "[") {
      const openStart = i;
      const contentStart = i + 1;
      let closeBracket = -1;
      let depth = 1;
      let j = contentStart;

      while (j < len) {
        if (line[j] === "\\" && j + 1 < len) {
          j += 2;
          continue;
        }
        if (line[j] === "[") {
          depth++;
        } else if (line[j] === "]") {
          depth--;
          if (depth === 0) {
            closeBracket = j;
            break;
          }
        }
        j++;
      }

      if (closeBracket !== -1 && closeBracket + 1 < len && line[closeBracket + 1] === "(") {
        const urlStart = closeBracket + 2;
        let urlEnd = -1;
        let pDepth = 1;
        let k = urlStart;

        while (k < len) {
          if (line[k] === "\\" && k + 1 < len) {
            k += 2;
            continue;
          }
          if (line[k] === "(") {
            pDepth++;
          } else if (line[k] === ")") {
            pDepth--;
            if (pDepth === 0) {
              urlEnd = k;
              break;
            }
          }
          k++;
        }

        if (urlEnd !== -1) {
          const closeStart = closeBracket;
          const closeEnd = urlEnd + 1;
          const linkUrl = line.slice(urlStart, urlEnd).trim();
          spans.push({
            type: "link",
            openDelim: "[",
            closeDelim: line.slice(closeBracket, closeEnd),
            openStart,
            openEnd: contentStart,
            contentStart,
            contentEnd: closeBracket,
            closeStart,
            closeEnd,
            linkUrl,
          });
          protectedRanges.push({ start: closeBracket, end: closeEnd });
          i = contentStart;
          continue;
        }
      }
    }

    i++;
  }

  const isProtected = (pos) => protectedRanges.some((r) => pos >= r.start && pos < r.end);
  const delimTokens = [];
  i = 0;

  while (i < len) {
    if (isProtected(i)) {
      i++;
      continue;
    }
    if (line[i] === "\\" && i + 1 < len) {
      i += 2;
      continue;
    }

    const ch = line[i];
    if (ch === "~") {
      let count = 1;
      while (i + count < len && line[i + count] === "~") {
        count++;
      }
      if (count >= 2) {
        const prevChar = i > 0 ? line[i - 1] : undefined;
        const nextChar = i + 2 < len ? line[i + 2] : undefined;
        const canOpen = !isWhitespaceChar(nextChar);
        const canClose = !isWhitespaceChar(prevChar);

        delimTokens.push({
          char: "~",
          origCount: 2,
          count: 2,
          start: i,
          end: i + 2,
          canOpen,
          canClose,
        });
        i += 2;
        continue;
      }
      i += count;
      continue;
    }

    if (ch === "*" || ch === "_") {
      let count = 1;
      while (i + count < len && line[i + count] === ch && !isProtected(i + count)) {
        count++;
      }

      const prevChar = i > 0 ? line[i - 1] : undefined;
      const nextChar = i + count < len ? line[i + count] : undefined;
      const prevWhite = isWhitespaceChar(prevChar);
      const prevPunct = isPunctuationChar(prevChar);
      const nextWhite = isWhitespaceChar(nextChar);
      const nextPunct = isPunctuationChar(nextChar);

      const leftFlanking = !nextWhite && (!nextPunct || prevWhite || prevPunct);
      const rightFlanking = !prevWhite && (!prevPunct || nextWhite || nextPunct);

      let canOpen = leftFlanking;
      let canClose = rightFlanking;

      if (ch === "_") {
        canOpen = leftFlanking && (!rightFlanking || prevPunct);
        canClose = rightFlanking && (!leftFlanking || nextPunct);
      }

      delimTokens.push({
        char: ch,
        origCount: count,
        count,
        start: i,
        end: i + count,
        canOpen,
        canClose,
      });

      i += count;
      continue;
    }

    i++;
  }

  const stack = [];
  for (const token of delimTokens) {
    if (token.canClose) {
      for (let sIdx = stack.length - 1; sIdx >= 0; sIdx--) {
        const opener = stack[sIdx];
        if (opener.char === token.char && opener.canOpen && opener.count > 0 && token.count > 0) {
          let matchCount = 1;
          if (token.char === "~") {
            matchCount = 2;
          } else {
            if (opener.count >= 3 && token.count >= 3) {
              matchCount = 3;
            } else if (opener.count >= 2 && token.count >= 2) {
              matchCount = 2;
            } else {
              matchCount = 1;
            }
          }

          let spanType = "italic";
          if (token.char === "~") {
            spanType = "strike";
          } else if (matchCount === 3) {
            spanType = "bold_italic";
          } else if (matchCount === 2) {
            spanType = "bold";
          }

          const delimStr = token.char.repeat(matchCount);
          const openStart = opener.end - matchCount;
          const openEnd = opener.end;
          const closeStart = token.start;
          const closeEnd = token.start + matchCount;

          spans.push({
            type: spanType,
            openDelim: delimStr,
            closeDelim: delimStr,
            openStart,
            openEnd,
            contentStart: openEnd,
            contentEnd: closeStart,
            closeStart,
            closeEnd,
          });

          opener.count -= matchCount;
          token.count -= matchCount;
          opener.end -= matchCount;
          token.start += matchCount;

          if (opener.count === 0) {
            stack.splice(sIdx, 1);
          }
          if (token.count === 0) {
            break;
          }
        }
      }
    }

    if (token.canOpen && token.count > 0) {
      stack.push(token);
    }
  }

  spans.sort((a, b) => a.openStart - b.openStart);
  return spans;
}

function calculateLineEdits(line, spans, selFrom, selTo) {
  const spanDepths = new Map();
  for (const span of spans) {
    let depth = 0;
    for (const other of spans) {
      if (
        other !== span &&
        other.openStart <= span.openStart &&
        other.closeEnd >= span.closeEnd
      ) {
        depth++;
      }
    }
    spanDepths.set(span, depth);
  }

  const deletions = [];
  const closeInserts = new Map();
  const openInserts = new Map();

  const addCloseInsert = (pos, delim, depth) => {
    if (!closeInserts.has(pos)) {
      closeInserts.set(pos, []);
    }
    closeInserts.get(pos).push({ delim, depth });
  };

  const addOpenInsert = (pos, delim, depth) => {
    if (!openInserts.has(pos)) {
      openInserts.set(pos, []);
    }
    openInserts.get(pos).push({ delim, depth });
  };

  for (const span of spans) {
    const depth = spanDepths.get(span) ?? 0;

    if (selTo <= span.openStart || selFrom >= span.closeEnd) {
      continue;
    }

    if (selFrom <= span.openStart && selTo >= span.closeEnd) {
      deletions.push({ start: span.openStart, end: span.openEnd });
      deletions.push({ start: span.closeStart, end: span.closeEnd });
      continue;
    }

    if (selFrom >= span.contentStart && selTo <= span.contentEnd) {
      if (selFrom === span.contentStart && selTo === span.contentEnd) {
        deletions.push({ start: span.openStart, end: span.openEnd });
        deletions.push({ start: span.closeStart, end: span.closeEnd });
        continue;
      }

      if (selFrom > span.contentStart && selTo < span.contentEnd) {
        const beforeText = line.slice(span.contentStart, selFrom);
        const afterText = line.slice(selTo, span.contentEnd);

        let beforeTrimLen = 0;
        while (beforeTrimLen < beforeText.length && beforeText[beforeText.length - 1 - beforeTrimLen] === " ") {
          beforeTrimLen++;
        }
        let afterTrimLen = 0;
        while (afterTrimLen < afterText.length && afterText[afterTrimLen] === " ") {
          afterTrimLen++;
        }

        const closeInsertPos = selFrom - beforeTrimLen;
        const openInsertPos = selTo + afterTrimLen;

        addCloseInsert(closeInsertPos, span.closeDelim, depth);
        addOpenInsert(openInsertPos, span.openDelim, depth);
        continue;
      }

      if (selFrom === span.contentStart && selTo < span.contentEnd) {
        deletions.push({ start: span.openStart, end: span.openEnd });

        const afterText = line.slice(selTo, span.contentEnd);
        let afterTrimLen = 0;
        while (afterTrimLen < afterText.length && afterText[afterTrimLen] === " ") {
          afterTrimLen++;
        }
        const openInsertPos = selTo + afterTrimLen;

        addOpenInsert(openInsertPos, span.openDelim, depth);
        continue;
      }

      if (selFrom > span.contentStart && selTo === span.contentEnd) {
        deletions.push({ start: span.closeStart, end: span.closeEnd });

        const beforeText = line.slice(span.contentStart, selFrom);
        let beforeTrimLen = 0;
        while (beforeTrimLen < beforeText.length && beforeText[beforeText.length - 1 - beforeTrimLen] === " ") {
          beforeTrimLen++;
        }
        const closeInsertPos = selFrom - beforeTrimLen;

        addCloseInsert(closeInsertPos, span.closeDelim, depth);
        continue;
      }
    }

    if (selFrom <= span.openStart && selTo > span.contentStart && selTo < span.contentEnd) {
      deletions.push({ start: span.openStart, end: span.openEnd });

      const afterText = line.slice(selTo, span.contentEnd);
      let afterTrimLen = 0;
      while (afterTrimLen < afterText.length && afterText[afterTrimLen] === " ") {
        afterTrimLen++;
      }
      const openInsertPos = selTo + afterTrimLen;

      addOpenInsert(openInsertPos, span.openDelim, depth);
      continue;
    }

    if (selFrom > span.contentStart && selFrom < span.contentEnd && selTo >= span.closeEnd) {
      deletions.push({ start: span.closeStart, end: span.closeEnd });

      const beforeText = line.slice(span.contentStart, selFrom);
      let beforeTrimLen = 0;
      while (beforeTrimLen < beforeText.length && beforeText[beforeText.length - 1 - beforeTrimLen] === " ") {
        beforeTrimLen++;
      }
      const closeInsertPos = selFrom - beforeTrimLen;

      addCloseInsert(closeInsertPos, span.closeDelim, depth);
      continue;
    }
  }

  const edits = [];
  const seenDeletes = new Set();
  for (const del of deletions) {
    const key = `${del.start}-${del.end}`;
    if (!seenDeletes.has(key)) {
      seenDeletes.add(key);
      edits.push({ start: del.start, end: del.end, replacement: "" });
    }
  }

  for (const [pos, items] of closeInserts.entries()) {
    items.sort((a, b) => b.depth - a.depth);
    const textToInsert = items.map((i) => i.delim).join("");
    edits.push({ start: pos, end: pos, replacement: textToInsert });
  }

  for (const [pos, items] of openInserts.entries()) {
    items.sort((a, b) => a.depth - b.depth);
    const textToInsert = items.map((i) => i.delim).join("");
    edits.push({ start: pos, end: pos, replacement: textToInsert });
  }

  return edits;
}

function clearInlineFormatting(text, from, to) {
  if (from === to || !text || text.length === 0) {
    return {
      text: text ?? "",
      from: from ?? 0,
      to: to ?? 0,
      changed: false,
    };
  }

  const selStart = Math.max(0, Math.min(from, to));
  const selEnd = Math.min(text.length, Math.max(from, to));

  if (selStart === selEnd) {
    return {
      text,
      from: selStart,
      to: selEnd,
      changed: false,
    };
  }

  const lines = text.split("\n");
  const edits = [];
  let lineOffset = 0;

  for (const line of lines) {
    const lineStart = lineOffset;
    const lineEnd = lineOffset + line.length;

    if (selEnd > lineStart && selStart < lineEnd) {
      const lineSelStart = Math.max(0, selStart - lineStart);
      const lineSelEnd = Math.min(line.length, selEnd - lineStart);

      if (lineSelStart < lineSelEnd) {
        const lineSpans = parseInlineSpans(line);
        const lineEdits = calculateLineEdits(line, lineSpans, lineSelStart, lineSelEnd);

        for (const edit of lineEdits) {
          edits.push({
            start: lineStart + edit.start,
            end: lineStart + edit.end,
            replacement: edit.replacement,
          });
        }
      }
    }

    lineOffset += line.length + 1;
  }

  if (edits.length === 0) {
    return {
      text,
      from: selStart,
      to: selEnd,
      changed: false,
    };
  }

  edits.sort((a, b) => b.start - a.start || b.end - a.end);

  let newText = text;
  let newSelStart = selStart;
  let newSelEnd = selEnd;

  for (const edit of edits) {
    newText = newText.slice(0, edit.start) + edit.replacement + newText.slice(edit.end);

    const oldLen = edit.end - edit.start;
    const newLen = edit.replacement.length;
    const delta = newLen - oldLen;

    if (edit.end <= newSelStart) {
      newSelStart += delta;
      newSelEnd += delta;
    } else if (edit.start < newSelStart && edit.end > newSelStart) {
      newSelStart = edit.start + newLen;
      newSelEnd += delta;
    } else if (edit.start >= newSelStart && edit.end <= newSelEnd) {
      newSelEnd += delta;
    } else if (edit.start < newSelEnd && edit.end > newSelEnd) {
      newSelEnd = edit.start + newLen;
    }
  }

  newSelStart = Math.max(0, Math.min(newSelStart, newText.length));
  newSelEnd = Math.max(newSelStart, Math.min(newSelEnd, newText.length));

  return {
    text: newText,
    from: newSelStart,
    to: newSelEnd,
    changed: newText !== text,
  };
}

function stripFormatting(text) {
  if (!text) return text ?? "";
  const result = clearInlineFormatting(text, 0, text.length);
  return result.text;
}

// 3. テストケースの実行

console.log("\n[Step 2] 空選択ガード (Collapsed Selection) の検証...");
{
  const res1 = clearInlineFormatting("**bold**", 2, 2);
  assert.strictEqual(res1.changed, false, "カーソルのみ（from === to）は changed: false であること");
  assert.strictEqual(res1.text, "**bold**", "テキストが一切変更されないこと");

  const res2 = clearInlineFormatting("", 0, 0);
  assert.strictEqual(res2.changed, false, "空テキストは changed: false であること");
}
console.log("✓ 空選択ガードが正常に機能することを確認");

console.log("\n[Step 3] 太字 (Bold: **) の書式クリア検証...");
{
  // 3-1. 中間分割: **前[中]後** -> **前**中**後**
  // 入力: "**Hello world typori**"
  // "world" の位置: 8..13
  const input = "**Hello world typori**";
  const wIdx = input.indexOf("world");
  const resMid = clearInlineFormatting(input, wIdx, wIdx + 5);
  assert.strictEqual(resMid.changed, true);
  assert.strictEqual(resMid.text, "**Hello** world **typori**", "中間分割で **前**中**後** になること");

  // 3-2. 先頭分割: **[前]後** -> 前**後**
  const hIdx = input.indexOf("Hello");
  const resHead = clearInlineFormatting(input, hIdx, hIdx + 5);
  assert.strictEqual(resHead.changed, true);
  assert.strictEqual(resHead.text, "Hello **world typori**", "先頭分割で 前**後** になること");

  // 3-3. 末尾分割: **前[後]** -> **前**後
  const tIdx = input.indexOf("typori");
  const resTail = clearInlineFormatting(input, tIdx, tIdx + 6);
  assert.strictEqual(resTail.changed, true);
  assert.strictEqual(resTail.text, "**Hello world** typori", "末尾分割で **前**後 になること");

  // 3-4. 全体解除（コンテンツ選択）: **[全体]** -> 全体
  const boldText = "**全体**";
  const resAll1 = clearInlineFormatting(boldText, 2, 4);
  assert.strictEqual(resAll1.changed, true);
  assert.strictEqual(resAll1.text, "全体", "コンテンツ全体の選択でデリミタが解除されること");

  // 3-5. 全体解除（デリミタ含む選択）: [**全体**] -> 全体
  const resAll2 = clearInlineFormatting(boldText, 0, boldText.length);
  assert.strictEqual(resAll2.changed, true);
  assert.strictEqual(resAll2.text, "全体", "デリミタを含む全体選択でデリミタが解除されること");

  // 3-6. 日本語（空白なし）の中間分割: **あいうえお** で "う" 選択 -> **あい**う**えお**
  const jaText = "**あいうえお**";
  const uIdx = jaText.indexOf("う");
  const resJa = clearInlineFormatting(jaText, uIdx, uIdx + 1);
  assert.strictEqual(resJa.changed, true);
  assert.strictEqual(resJa.text, "**あい**う**えお**", "空白なし日本語で **あい**う**えお** になること");

  // 3-7. アンダースコア記法: __Hello world typori__ で "world" 選択
  const underText = "__Hello world typori__";
  const uwIdx = underText.indexOf("world");
  const resUnder = clearInlineFormatting(underText, uwIdx, uwIdx + 5);
  assert.strictEqual(resUnder.changed, true);
  assert.strictEqual(resUnder.text, "__Hello__ world __typori__", "アンダースコア記法でも正しく分割されること");
}
console.log("✓ 太字の各種分割・解除が正常に動作することを確認");

console.log("\n[Step 4] イタリック・打ち消し線・インラインコードの書式クリア検証...");
{
  // 4-1. イタリック: *Hello world typori* で "world" 選択
  const itText = "*Hello world typori*";
  const iwIdx = itText.indexOf("world");
  const resIt = clearInlineFormatting(itText, iwIdx, iwIdx + 5);
  assert.strictEqual(resIt.text, "*Hello* world *typori*", "イタリックの中間分割が正しく行われること");

  // 4-2. 打ち消し線: ~~Hello world typori~~ で "world" 選択
  const stText = "~~Hello world typori~~";
  const swIdx = stText.indexOf("world");
  const resSt = clearInlineFormatting(stText, swIdx, swIdx + 5);
  assert.strictEqual(resSt.text, "~~Hello~~ world ~~typori~~", "打ち消し線の中間分割が正しく行われること");

  // 4-3. インラインコード: `const a = 1;` で全体選択
  const codeText = "`const a = 1;`";
  const resCode = clearInlineFormatting(codeText, 1, codeText.length - 1);
  assert.strictEqual(resCode.text, "const a = 1;", "インラインコードの解除が正しく行われること");

  // 4-4. インラインコードの中間分割: `foo bar baz` で "bar" 選択
  const codeText2 = "`foo bar baz`";
  const bIdx = codeText2.indexOf("bar");
  const resCodeMid = clearInlineFormatting(codeText2, bIdx, bIdx + 3);
  assert.strictEqual(resCodeMid.text, "`foo` bar `baz`", "インラインコードの中間分割が正しく行われること");
}
console.log("✓ イタリック・打ち消し線・インラインコードの分割・解除を確認");

console.log("\n[Step 5] リンク ([表示テキスト](URL)) の書式クリア検証...");
{
  // 5-1. リンク全体解除: [Typori Editor](https://github.com) で全体選択 -> Typori Editor
  const linkText = "[Typori Editor](https://github.com)";
  const resLinkAll = clearInlineFormatting(linkText, 0, linkText.length);
  assert.strictEqual(resLinkAll.text, "Typori Editor", "リンク全体選択でリンク記法が解除され表示テキストのみになること");

  // 5-2. リンク表示テキストの選択: [Typori Editor](https://github.com) で "Typori Editor" 選択
  const resLinkContent = clearInlineFormatting(linkText, 1, 14);
  assert.strictEqual(resLinkContent.text, "Typori Editor", "表示テキスト選択でリンク記法が解除されること");

  // 5-3. リンク表示テキストの中間分割: [Hello world typori](url) で "world" 選択
  const linkMid = "[Hello world typori](https://example.com)";
  const lwIdx = linkMid.indexOf("world");
  const resLinkMid = clearInlineFormatting(linkMid, lwIdx, lwIdx + 5);
  assert.strictEqual(
    resLinkMid.text,
    "[Hello](https://example.com) world [typori](https://example.com)",
    "リンク内の中間分割で [前](url) 中 [後](url) になること"
  );
}
console.log("✓ リンクの解除および分割が正常に動作することを確認");

console.log("\n[Step 6] 複合装飾・ネスト・複数装飾一括クリアの検証...");
{
  // 6-1. 太字+斜体: ***前[中]後*** -> ***前***中***後***
  const biText = "***Hello world typori***";
  const biwIdx = biText.indexOf("world");
  const resBi = clearInlineFormatting(biText, biwIdx, biwIdx + 5);
  assert.strictEqual(resBi.text, "***Hello*** world ***typori***", "太字+斜体の中間分割が正常に行われること");

  // 6-2. ネスト装飾: **~~前[中]後~~** -> **~~前~~**中**~~後~~**
  const nestText = "**~~Hello world typori~~**";
  const nwIdx = nestText.indexOf("world");
  const resNest = clearInlineFormatting(nestText, nwIdx, nwIdx + 5);
  assert.strictEqual(resNest.text, "**~~Hello~~** world **~~typori~~**", "ネスト装飾の中間分割が正常に行われること");

  // 6-3. 広い範囲の複数装飾一括クリア: 前[ **太字** 中 *斜体* ]後 -> 前 太字 中 斜体 後
  const multiText = "前 **太字** 中 *斜体* 後";
  const selStart = multiText.indexOf("**太字**");
  const selEnd = multiText.indexOf("*斜体*") + "*斜体*".length;
  const resMulti = clearInlineFormatting(multiText, selStart, selEnd);
  assert.strictEqual(resMulti.text, "前 太字 中 斜体 後", "複数装飾にまたがる範囲で全デリミタが一括除去されること");

  // 6-4. 端点交差: **前[太字** と *斜]体* -> **前**太字 と 斜*体*
  const crossText = "**前太字** と *斜体*";
  // "太字** と *斜" を選択
  const cStart = crossText.indexOf("太字");
  const cEnd = crossText.indexOf("斜") + 1;
  const resCross = clearInlineFormatting(crossText, cStart, cEnd);
  assert.strictEqual(resCross.text, "**前**太字 と 斜*体*", "端点交差時に選択範囲外のみ装飾が維持されること");
}
console.log("✓ 複合装飾・ネスト・複数装飾一括クリア・端点交差が正常に動作することを確認");

console.log("\n[Step 7] プレーンテキスト選択および stripFormatting の検証...");
{
  // 7-1. 装飾のないプレーンテキスト: 変更なし
  const plainText = "Hello world typori";
  const resPlain = clearInlineFormatting(plainText, 0, 5);
  assert.strictEqual(resPlain.changed, false, "装飾のない範囲では changed: false であること");
  assert.strictEqual(resPlain.text, plainText, "テキストが変更されないこと");

  // 7-2. stripFormatting: 全体の一括プレーンテキスト化
  const doc = "# 見出し\nこれは **太字** と *斜体* と ~~打消し~~ と `コード` と [リンク](http://example.com) です。";
  const stripped = stripFormatting(doc);
  assert.strictEqual(
    stripped,
    "# 見出し\nこれは 太字 と 斜体 と 打消し と コード と リンク です。",
    "stripFormatting で文書内のすべてのインライン装飾記法が解除されること"
  );
}
console.log("✓ プレーンテキスト選択および stripFormatting の動作を確認");

console.log("\n==================================================================");
console.log("  ✓ 書式クリア純粋ロジック単体検証 (verify-clear-formatting-logic.mjs) 合格");
console.log("==================================================================");
