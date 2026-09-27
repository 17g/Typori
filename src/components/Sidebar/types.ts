export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface SidebarProps {
  currentDirectory: string | null;
  entries: FileEntry[];
  selectedPath?: string | null;
  directoryContents?: Record<string, FileEntry[]>;
  expandedPaths?: Set<string>;
  loadingPaths?: Set<string>;
  isLoading?: boolean;
  error?: string | null;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onSelectFile?: (entry: FileEntry) => void;
  onToggleDirectory?: (entry: FileEntry) => void;
  onNavigateUp?: () => void;
  onRefresh?: () => void;
  onOpenDirectory?: (path: string) => void;
  onCreateFile?: (fileName: string) => Promise<boolean | void>;
}
