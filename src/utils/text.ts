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
