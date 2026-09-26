import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800/80 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/60 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6 mb-6">
          <a
            href="https://vite.dev"
            target="_blank"
            rel="noreferrer"
            className="transition-transform hover:scale-110"
          >
            <img src="/vite.svg" className="w-12 h-12" alt="Vite logo" />
          </a>
          <a
            href="https://tauri.app"
            target="_blank"
            rel="noreferrer"
            className="transition-transform hover:scale-110"
          >
            <img src="/tauri.svg" className="w-12 h-12" alt="Tauri logo" />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            rel="noreferrer"
            className="transition-transform hover:scale-110"
          >
            <img src={reactLogo} className="w-12 h-12" alt="React logo" />
          </a>
        </div>

        <h1 className="text-2xl font-bold text-center tracking-tight mb-2">
          Typori
        </h1>
        <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mb-6">
          Next-Gen Minimalist Markdown Editor
        </p>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <div className="flex gap-2">
            <input
              id="greet-input"
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="名前を入力..."
              value={name}
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Greet
            </button>
          </div>
        </form>

        {greetMsg && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-sm text-indigo-700 dark:text-indigo-300 text-center">
            {greetMsg}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
