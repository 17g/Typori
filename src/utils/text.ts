/**
 * テキストユーティリティモジュール
 * 改行コード正規化および未保存判定（Dirty state）ロジックを提供します。
 */

/**
 * 改行コードを LF (\n) に統一正規化します。
 * CRLF (\r\n) および CR (\r) をすべて LF (\n) に置換します。
 * 
 * @param text 対象テキスト
 * @returns LF に統一されたテキスト
 */
export function normalizeLineEndings(text: string): string {
  if (!text) return text ?? "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * 現在のコンテンツと保存済みベースラインコンテンツを比較し、
 * 実質的な変更（未保存の変更）があるかどうかを判定します。
 * 改行コードの違い（CRLF vs LF）のみの場合は false（未保存と判定しない）を返します。
 * 
 * @param current 現在のエディタ/ドキュメント内容
 * @param baseline 保存済み（または初期ロード時）の内容
 * @returns 実質的な変更がある場合は true、一致している場合は false
 */
export function isContentDirty(
  current: string | null | undefined,
  baseline: string | null | undefined
): boolean {
  if (current === null || current === undefined) {
    return false;
  }
  if (baseline === null || baseline === undefined) {
    return Boolean(current);
  }
  return normalizeLineEndings(current) !== normalizeLineEndings(baseline);
}

/**
 * 大容量ファイルの判定閾値
 * 300KB (307,200 bytes) または 2,000行以上
 */
export const LARGE_FILE_SIZE_THRESHOLD = 300 * 1024;
export const LARGE_FILE_LINE_THRESHOLD = 2000;

/**
 * 与えられたテキストが大容量コンテンツ（300KB以上または2000行以上）かどうかを判定します。
 * 
 * @param content 対象テキスト
 * @param sizeThreshold バイト数/文字数閾値（デフォルト 300KB）
 * @param lineThreshold 行数閾値（デフォルト 2000行）
 * @returns 大容量コンテンツの場合は true
 */
export function isLargeContent(
  content: string | null | undefined,
  sizeThreshold = LARGE_FILE_SIZE_THRESHOLD,
  lineThreshold = LARGE_FILE_LINE_THRESHOLD
): boolean {
  if (!content) return false;
  if (content.length >= sizeThreshold) return true;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) {
      lines++;
      if (lines >= lineThreshold) return true;
    }
  }
  return false;
}
