import { useState, useEffect, useMemo, FC } from "react";
import {
  SHORTCUT_ITEMS,
  MARKDOWN_SYNTAX_ITEMS,
  SHORTCUT_CATEGORIES,
  MARKDOWN_CATEGORIES,
} from "./data";
import { CheatSheetTab } from "./types";
import { ShortcutConfig } from "../ShortcutSettingsModal";

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcutConfig?: ShortcutConfig;
}

export const CheatSheetModal: FC<CheatSheetModalProps> = ({
  isOpen,
  onClose,
  shortcutConfig,
}) => {
  const [activeTab, setActiveTab] = useState<CheatSheetTab>("shortcuts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Esc キーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // モーダルオープン時に検索・カテゴリをリセット
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen, activeTab]);

  // クリップボードへコピー
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    } catch (err) {
      console.error("クリップボードへのコピーに失敗しました:", err);
    }
  };

  // フィルタリング処理（動的ショートカット設定を考慮）
  const filteredShortcuts = useMemo(() => {
    return SHORTCUT_ITEMS.map((item) => {
      const activeKeys =
        shortcutConfig && shortcutConfig[item.id] !== undefined
          ? shortcutConfig[item.id]
          : item.keys;
      return {
        ...item,
        keys: activeKeys,
      };
    }).filter((item) => {
      const matchCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery, shortcutConfig]);

  const filteredMarkdown = useMemo(() => {
    return MARKDOWN_SYNTAX_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.syntax.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const currentCategories =
    activeTab === "shortcuts" ? SHORTCUT_CATEGORIES : MARKDOWN_CATEGORIES;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="チートシート"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-zinc-800 dark:text-zinc-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">
                  Typori チートシート
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  ショートカットキーおよびMarkdown記法の早見表
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="閉じる (Esc)"
              aria-label="閉じる"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* タブ切り替えと検索 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg text-xs font-medium">
              <button
                onClick={() => {
                  setActiveTab("shortcuts");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTab === "shortcuts"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span>ショートカットキー</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("markdown");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTab === "markdown"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span>Markdown記法</span>
              </button>
            </div>

            {/* 検索入力欄 */}
            <div className="relative flex-1 max-w-xs">
              <svg
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="機能名や記法で検索..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* カテゴリフィルター */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            {currentCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white font-medium"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* モーダルコンテンツ（スクロール可能領域） */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "shortcuts" ? (
            filteredShortcuts.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
                該当するショートカットキーが見つかりませんでした。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredShortcuts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                        {item.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.length === 0 ? (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                          未設定
                        </span>
                      ) : (
                        item.keys.map((k, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                +
                              </span>
                            )}
                            <kbd className="inline-block px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                              {k}
                            </kbd>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredMarkdown.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
              該当するMarkdown記法が見つかりませんでした。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMarkdown.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleCopy(item.id, item.syntax)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                          copiedId === item.id
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium"
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                        }`}
                        title="記法をコピー"
                      >
                        {copiedId === item.id ? (
                          <>
                            <svg
                              className="w-3 h-3 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>コピー済</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            <span>コピー</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 rounded-md p-2 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre">
                    {item.syntax}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 font-mono text-[10px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 mr-1">
                F1
              </kbd>
              チートシートの開閉
            </span>
            <span>
              <kbd className="px-1 py-0.5 font-mono text-[10px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 mr-1">
                Esc
              </kbd>
              閉じる
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
