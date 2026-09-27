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

