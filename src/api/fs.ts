import { invoke } from "@tauri-apps/api/core";
import { FileEntry } from "../components/Sidebar/types";

/**
 * 指定ディレクトリ直下のファイルおよびディレクトリ一覧を取得します。
 * @param path 対象ディレクトリのパス
 */
export async function readDir(path: string): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("read_dir", { path });
}

/**
 * カレントワーキングディレクトリの絶対パスを取得します。
 */
export async function getCurrentDir(): Promise<string> {
  return await invoke<string>("get_current_dir");
}

/**
 * 指定パスの親ディレクトリのパスを取得します。親が存在しない場合は null を返します。
 * @param path 対象パス
 */
export async function getParentDir(path: string): Promise<string | null> {
  return await invoke<string | null>("get_parent_dir", { path });
}

/**
 * 指定パスのファイルをUTF-8テキストとして読み込みます。
 * @param path 対象ファイルのパス
 */
export async function openFile(path: string): Promise<string> {
  return await invoke<string>("open_file", { path });
}

/**
 * 指定パスにテキストを保存します。
 * @param path 対象ファイルのパス
 * @param content ファイル内容
 */
export async function saveFile(path: string, content: string): Promise<void> {
  await invoke<void>("save_file", { path, content });
}

/**
 * 指定パスに新しいファイルを作成します。
 * @param path 作成するファイルのフルパス
 * @param initialContent 初期コンテンツ（省略時は空文字）
 */
export async function createFile(path: string, initialContent?: string): Promise<FileEntry> {
  return await invoke<FileEntry>("create_file", { path, initialContent });
}

/**
 * コマンドライン引数を取得します。
 */
export async function getCliArgs(): Promise<string[]> {
  return await invoke<string[]>("get_cli_args");
}

/**
 * 指定ディレクトリ配下を再帰的に走査し、ファイル名・フォルダ名にクエリが含まれるエントリを検索します。
 * @param rootPath 検索起点ディレクトリのパス
 * @param query 検索クエリ
 * @param maxResults 最大取得件数（デフォルト200）
 */
export async function searchFiles(
  rootPath: string,
  query: string,
  maxResults?: number
): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("search_files", {
    rootPath,
    query,
    maxResults,
  });
}

export interface SavedImage {
  file_name: string;
  relative_path: string;
  absolute_path: string;
}

/**
 * ファイルパスまたはファイル名が画像ファイルかどうかを判定します。
 */
export function isImageFilePath(path: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".tiff"];
  const lower = path.toLowerCase();
  return imageExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * 指定されたローカル画像ファイルを開いているドキュメントの assets フォルダにコピーして保存します。
 */
export async function saveImageFile(
  sourcePath: string,
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<SavedImage> {
  return await invoke<SavedImage>("save_image_file", {
    sourcePath,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * バイナリデータから画像を開いているドキュメントの assets フォルダに保存します。
 */
export async function saveImageBinary(
  fileName: string,
  data: number[],
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<SavedImage> {
  return await invoke<SavedImage>("save_image_binary", {
    fileName,
    data,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * 指定されたパスのファイルのバイナリデータを読み込みます。
 */
export async function readFileBinary(path: string): Promise<number[]> {
  return await invoke<number[]>("read_file_binary", { path });
}

/**
 * 画像の相対パスから絶対パスを解決します。
 */
export async function resolveImagePath(
  imageSrc: string,
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<string> {
  return await invoke<string>("resolve_image_path", {
    imageSrc,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * Markdown文字列をスタンドアロンのHTML（CSSスタイル内蔵）文字列に変換します。
 */
export async function convertMarkdownToHtml(
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<string> {
  return await invoke<string>("convert_markdown_to_html", {
    markdown,
    title: title ?? null,
    theme: theme ?? null,
  });
}

/**
 * 指定パスにMarkdownをHTMLファイルとしてエクスポートします。
 */
export async function exportToHtml(
  path: string,
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<void> {
  await invoke<void>("export_to_html", {
    path,
    markdown,
    title: title ?? null,
    theme: theme ?? null,
  });
}


