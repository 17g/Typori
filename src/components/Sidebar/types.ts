export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface SidebarProps {
  entries?: FileEntry[];
  selectedPath?: string | null;
  currentDirectory?: string | null;
  onSelectEntry?: (entry: FileEntry) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}
