/**
 * URLセキュリティ・検証ユーティリティモジュール
 * 外部リンク起動時の許可スキーム（http:, https:, mailto:）ホワイトリスト検証を提供します。
 */

/**
 * 許可された外部URLスキーム一覧
 * file:, javascript:, ms-msdt: などの危険なスキームを排除し、安全な Web / メールスキームのみ許可します。
 */
export const ALLOWED_EXTERNAL_URL_SCHEMES = ["http:", "https:", "mailto:"] as const;

export type AllowedExternalUrlScheme = (typeof ALLOWED_EXTERNAL_URL_SCHEMES)[number];

/**
 * 指定されたURLが安全な外部リンク（http:, https:, mailto:）であるかを検証します。
 * 
 * - 空文字、null、undefined、非文字列は拒否します。
 * - 制御文字やヌルバイトを含む不正文字列は拒否します。
 * - javascript:, vbscript:, data:text/html, file:, ms-msdt: 等の危険なスキームを遮断します。
 * - 相対パスやフラグメントのみのリンクも外部ブラウザ起動としては安全でないため拒否します。
 * 
 * @param url 検証対象のURL文字列
 * @returns 許可されたスキームであれば true、それ以外は false
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  // 制御文字やヌルバイトが含まれる場合は安全でないと判定
  if (/[\x00-\x1f\x7f-\x9f]/.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    return (ALLOWED_EXTERNAL_URL_SCHEMES as readonly string[]).includes(protocol);
  } catch {
    // 相対URLや不正構文のURLは拒否
    return false;
  }
}
