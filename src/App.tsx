import { useState } from "react";
import TyporiEditor from "./components/Editor";
import Sidebar, { FileEntry } from "./components/Sidebar";

const initialSampleEntries: FileEntry[] = [
  { name: "docs", path: "/docs", is_dir: true },
  { name: "README.md", path: "/README.md", is_dir: false },
  { name: "getting-started.md", path: "/getting-started.md", is_dir: false },
  { name: "notes.txt", path: "/notes.txt", is_dir: false },
];

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>("/README.md");
  const [entries] = useState<FileEntry[]>(initialSampleEntries);

  const handleSelectEntry = (entry: FileEntry) => {
    setSelectedPath(entry.path);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSidebar}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="サイドバーの表示切替"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>
          <div className="font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
            Typori
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span>Markdown Mode</span>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          entries={entries}
          selectedPath={selectedPath}
          currentDirectory="Workspace"
          onSelectEntry={handleSelectEntry}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
        />
        <TyporiEditor />
      </div>
    </main>
  );
}

export default App;

