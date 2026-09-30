export interface TabItem {
  /** 一意なタブID（通常はファイルパス） */
  id: string;
  /** ファイルのフルパス（未保存の新規ファイルの場合は空文字または仮パス） */
  path: string;
  /** タブに表示するファイル名 */
  title: string;
  /** 現在編集中のMarkdownテキスト */
  content: string;
  /** 保存済み（ディスク上）のMarkdownテキスト */
  savedContent: string;
  /** 未保存の変更があるかどうか */
  isDirty?: boolean;
}

export interface TabBarProps {
  /** 開いているタブの一覧 */
  tabs: TabItem[];
  /** 現在アクティブなタブID */
  activeTabId: string | null;
  /** タブが選択（クリック）された時のハンドラ */
  onSelectTab: (tabId: string) => void;
  /** タブを閉じる（✕ボタン）時のハンドラ */
  onCloseTab: (tabId: string) => void;
  /** 新規タブ作成ボタンが押された時のハンドラ（オプション） */
  onNewTab?: () => void;
}
