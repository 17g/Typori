import TyporiEditor from "./components/Editor";

function App() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 select-none">
        <div className="font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
          Typori
        </div>
        <div className="flex items-center gap-2">
          <span>Markdown Mode</span>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <TyporiEditor />
      </div>
    </main>
  );
}

export default App;
