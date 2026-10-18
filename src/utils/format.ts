/**
 * 書式整形・書式クリアユーティリティモジュール (Format Utilities)
 * 
 * Markdown のインライン記法（太字、イタリック、打ち消し線、インラインコード、リンク、複合装飾等）に対し、
 * 選択範囲に応じた自動分割・置換・装飾解除（Clear Formatting / Bare）を行う純粋関数を提供します。
 */

/**
 * サポートされるインライン装飾の種別
 */
export type InlineFormatType =
  | "bold"
  | "italic"
  | "bold_italic"
  | "strike"
  | "code"
  | "link";

/**
 * 構文解析されたインライン装飾スパン情報
 */
export interface InlineSpan {
  type: InlineFormatType;
  openDelim: string;
  closeDelim: string;
  openStart: number;
  openEnd: number;
  contentStart: number;
  contentEnd: number;
  closeStart: number;
  closeEnd: number;
  linkUrl?: string;
}

/**
 * 書式クリアの実行結果
 */
export interface ClearFormattingResult {
  /** 変換後のテキスト全体 */
  text: string;
  /** 変換後の選択開始位置 (0-indexed) */
  from: number;
  /** 変換後の選択終了位置 (0-indexed) */
  to: number;
  /** 何らかの書式クリア（変更）が行われたかどうか */
  changed: boolean;
}

/**
 * テキスト置換（編集）情報
 */
interface TextEdit {
  start: number;
  end: number;
  replacement: string;
}

/**
 * 指定文字が空白文字かどうかを判定します。
 */
function isWhitespaceChar(ch: string | undefined): boolean {
  if (!ch) return true;
  return /\s/.test(ch);
}

/**
 * 指定文字が句読点記号かどうかを判定します（CommonMark 句読点判定基準）。
 */
function isPunctuationChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/.test(ch);
}

/**
 * 単一行内のインライン装飾スパン（コード、リンク、太字、イタリック、打ち消し線）を構文解析します。
 * 
 * @param line パース対象の行テキスト
 * @returns 検出されたインラインスパンの配列（出現順）
 */
export function parseInlineSpans(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const len = line.length;
  if (len === 0) return spans;

  // 1. コードスパンとリンクを事前検出（保護対象・確定スパン）
  // コードスパン内部は他のMarkdown記法を一切パースしない
  const protectedRanges: Array<{ start: number; end: number }> = [];

  let i = 0;
  while (i < len) {
    // バックスラッシュエスケープのスキップ
    if (line[i] === "\\" && i + 1 < len) {
      i += 2;
      continue;
    }

    // 1-A. インラインコード (`...` または ``...`` 等)
    if (line[i] === "`") {
      let runLen = 1;
      while (i + runLen < len && line[i + runLen] === "`") {
        runLen++;
      }
      const backticks = line.slice(i, i + runLen);
      const contentStart = i + runLen;
      // 閉じるバッククォートを探索
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

    // 1-B. リンク [text](url)
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
          // リンクURL部分のみ保護し、リンクテキスト部分は後続の太字・イタリック解析を許容する
          protectedRanges.push({ start: closeBracket, end: closeEnd });
          i = contentStart;
          continue;
        }
      }
    }

    i++;
  }

  // 指定インデックスが保護区間（コードスパン内部またはリンクURL内部）に含まれるか判定
  const isProtected = (pos: number): boolean => {
    return protectedRanges.some((r) => pos >= r.start && pos < r.end);
  };

  // 2. デリミタベースの装飾（太字・イタリック・打ち消し線）のトークン収集
  interface DelimToken {
    char: string;
    origCount: number;
    count: number;
    start: number;
    end: number;
    canOpen: boolean;
    canClose: boolean;
  }

  const delimTokens: DelimToken[] = [];
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

    // 打ち消し線 ~~
    if (ch === "~") {
      let count = 1;
      while (i + count < len && line[i + count] === "~") {
        count++;
      }
      if (count >= 2) {
        // 2個単位でトークン化
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

    // 太字・イタリック (* または _)
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

  // 3. デリミタスタックマッチングによるスパン生成
  const stack: DelimToken[] = [];

  for (const token of delimTokens) {
    if (token.canClose) {
      // スタックからマッチする open トークンを逆順探索
      for (let sIdx = stack.length - 1; sIdx >= 0; sIdx--) {
        const opener = stack[sIdx];
        if (opener.char === token.char && opener.canOpen && opener.count > 0 && token.count > 0) {
          // マッチするデリミタ数を決定
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

          let spanType: InlineFormatType = "italic";
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

  // 出現開始位置でソート
  spans.sort((a, b) => a.openStart - b.openStart);
  return spans;
}

/**
 * テキスト内の指定選択範囲に対し、インライン記法（太字・イタリック・打ち消し線・コード・リンク等）の
 * 書式を解除（Bare）し、選択範囲外の装飾は適切に分割・維持して整形した新しいテキストと選択範囲を返します。
 * 
 * 誤操作防止のため、選択範囲が空（from === to）の場合は何も実行せず changed: false を返します（空選択ガード）。
 * 
 * @param text 対象のMarkdownテキスト
 * @param from 選択開始位置（0-indexed）
 * @param to 選択終了位置（0-indexed）
 * @returns 整形後のテキスト、新しい選択位置、および変更有無
 */
export function clearInlineFormatting(
  text: string,
  from: number,
  to: number
): ClearFormattingResult {
  // 空選択ガード: 選択範囲がない、またはテキストが空の場合は何もしない
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

  // 複数行テキストの場合、行ごとにパース・置換を適用
  const lines = text.split("\n");
  const edits: TextEdit[] = [];
  let lineOffset = 0;

  for (const line of lines) {
    const lineStart = lineOffset;
    const lineEnd = lineOffset + line.length;

    // 該当行が選択範囲と交差している場合のみ処理
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

    lineOffset += line.length + 1; // +1 は '\n'
  }

  if (edits.length === 0) {
    return {
      text,
      from: selStart,
      to: selEnd,
      changed: false,
    };
  }

  // 重複・オーバーラップする編集の統合とソート（後ろから適用）
  edits.sort((a, b) => b.start - a.start || b.end - a.end);

  let newText = text;
  let newSelStart = selStart;
  let newSelEnd = selEnd;

  // 後ろから順にテキストを置換
  for (const edit of edits) {
    newText = newText.slice(0, edit.start) + edit.replacement + newText.slice(edit.end);

    const oldLen = edit.end - edit.start;
    const newLen = edit.replacement.length;
    const delta = newLen - oldLen;

    // 選択範囲位置の追跡・調整
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

  // 選択範囲が逆転しないようガード
  newSelStart = Math.max(0, Math.min(newSelStart, newText.length));
  newSelEnd = Math.max(newSelStart, Math.min(newSelEnd, newText.length));

  return {
    text: newText,
    from: newSelStart,
    to: newSelEnd,
    changed: newText !== text,
  };
}

/**
 * 1行内のスパン群と選択範囲に基づき、デリミタの除去・分割置換（TextEdit）を計算します。
 */
function calculateLineEdits(
  line: string,
  spans: InlineSpan[],
  selFrom: number,
  selTo: number
): TextEdit[] {
  // スパンを深さ（ネスト階層）でソートできるように、外側スパン（包含するスパン）ほど depth が小さくなるよう計算
  const spanDepths = new Map<InlineSpan, number>();
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

  // 位置ごとの挿入・削除操作を記録
  const deletions: Array<{ start: number; end: number }> = [];
  const closeInserts = new Map<number, Array<{ delim: string; depth: number }>>();
  const openInserts = new Map<number, Array<{ delim: string; depth: number }>>();

  const addCloseInsert = (pos: number, delim: string, depth: number) => {
    if (!closeInserts.has(pos)) {
      closeInserts.set(pos, []);
    }
    closeInserts.get(pos)!.push({ delim, depth });
  };

  const addOpenInsert = (pos: number, delim: string, depth: number) => {
    if (!openInserts.has(pos)) {
      openInserts.set(pos, []);
    }
    openInserts.get(pos)!.push({ delim, depth });
  };

  for (const span of spans) {
    const depth = spanDepths.get(span) ?? 0;

    // 1. スパンと選択範囲が全く交差しない場合: 何もしない
    if (selTo <= span.openStart || selFrom >= span.closeEnd) {
      continue;
    }

    // 2. スパン全体が選択範囲に含まれている場合 (例: [ **太字** ] や [**太字**])
    if (selFrom <= span.openStart && selTo >= span.closeEnd) {
      deletions.push({ start: span.openStart, end: span.openEnd });
      deletions.push({ start: span.closeStart, end: span.closeEnd });
      continue;
    }

    // 3. 選択範囲がスパンの内側（コンテンツ内）にある場合
    if (selFrom >= span.contentStart && selTo <= span.contentEnd) {
      // 3-A. コンテンツ全体を選択している場合 (例: **[太字]**)
      if (selFrom === span.contentStart && selTo === span.contentEnd) {
        deletions.push({ start: span.openStart, end: span.openEnd });
        deletions.push({ start: span.closeStart, end: span.closeEnd });
        continue;
      }

      // 3-B. 中間部分を選択している場合 (例: **前[中]後**)
      if (selFrom > span.contentStart && selTo < span.contentEnd) {
        const beforeText = line.slice(span.contentStart, selFrom);
        const afterText = line.slice(selTo, span.contentEnd);

        // 空白のトリム調整
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

      // 3-C. 先頭部分を含む選択 (例: **[前]後**)
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

      // 3-D. 末尾部分を含む選択 (例: **前[後]**)
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

    // 4. 選択範囲がスパンの先頭側と交差する場合 (例: 前[中 **太字]後**)
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

    // 5. 選択範囲がスパンの末尾側と交差する場合 (例: **前[太字** 中]後)
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

  // 編集リストの集約
  const edits: TextEdit[] = [];

  // 削除エディットの登録（重複防止）
  const seenDeletes = new Set<string>();
  for (const del of deletions) {
    const key = `${del.start}-${del.end}`;
    if (!seenDeletes.has(key)) {
      seenDeletes.add(key);
      edits.push({ start: del.start, end: del.end, replacement: "" });
    }
  }

  // 閉じるデリミタの挿入: 内側（depth 大）を先に、外側（depth 小）を後に挿入
  for (const [pos, items] of closeInserts.entries()) {
    items.sort((a, b) => b.depth - a.depth);
    const textToInsert = items.map((i) => i.delim).join("");
    edits.push({ start: pos, end: pos, replacement: textToInsert });
  }

  // 開くデリミタの挿入: 外側（depth 小）を先に、内側（depth 大）を後に挿入
  for (const [pos, items] of openInserts.entries()) {
    items.sort((a, b) => a.depth - b.depth);
    const textToInsert = items.map((i) => i.delim).join("");
    edits.push({ start: pos, end: pos, replacement: textToInsert });
  }

  return edits;
}

/**
 * テキスト全体の装飾デリミタ（太字・イタリック・打ち消し線・コード・リンク等）を一括除去し、
 * 素のプレーンテキストを返します。
 * 
 * @param text 対象のMarkdownテキスト
 * @returns 装飾が除去されたプレーンテキスト
 */
export function stripFormatting(text: string): string {
  if (!text) return text ?? "";
  const result = clearInlineFormatting(text, 0, text.length);
  return result.text;
}

/**
 * 指定範囲内に何らかのインライン装飾スパンが含まれるか、または指定範囲が装飾スパンの
 * 内部にあるかどうかを判定します。
 * 
 * @param text 対象のMarkdownテキスト
 * @param from 選択開始位置
 * @param to 選択終了位置
 * @returns 装飾が存在する場合は true
 */
export function hasFormatting(text: string, from: number, to: number): boolean {
  if (!text || from === to) return false;
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const lineStart = offset;
    const lineEnd = offset + line.length;

    if (end > lineStart && start < lineEnd) {
      const lineSelStart = Math.max(0, start - lineStart);
      const lineSelEnd = Math.min(line.length, end - lineStart);
      const spans = parseInlineSpans(line);

      for (const span of spans) {
        if (lineSelEnd > span.openStart && lineSelStart < span.closeEnd) {
          return true;
        }
      }
    }
    offset += line.length + 1;
  }

  return false;
}
