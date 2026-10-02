import React, { useRef, useEffect } from "react";
import { TabBarProps } from "./types";
import { isContentDirty } from "../../utils/text";

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // アクティブタブが変更されたら、そのタブが見えるようにスクロールする
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      className="flex items-center w-full h-8 px-1.5 bg-zinc-100/90 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800/60 select-none z-10"
      aria-label="開いているファイルのタブ"
    >
      <div
        ref={scrollContainerRef}
        role="tablist"
        className="flex items-center gap-1 overflow-x-auto h-full flex-1 no-scrollbar py-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDirty = tab.isDirty ?? isContentDirty(tab.content, tab.savedContent);

          return (
            <div
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                // 中クリック（ホイールクリック）でタブを閉じる
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTab(tab.id);
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
                  e.preventDefault();
                  onCloseTab(tab.id);
                }
              }}
              className={`group relative flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-t transition-all duration-100 max-w-[200px] min-w-[110px] cursor-pointer outline-hidden ${
                isActive
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs border-t-2 border-indigo-500 dark:border-indigo-400"
                  : "bg-zinc-200/40 hover:bg-zinc-200/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title={tab.path || tab.title}
            >
              {/* Markdownファイルアイコン */}
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              {/* ファイルタイトル */}
              <span className="truncate flex-1 text-left text-[11px]">
                {tab.title}
              </span>

              {/* 未保存インジケータ */}
              {isDirty && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
                  title="未保存の変更があります"
                />
              )}

              {/* 閉じるボタン (✕) */}
              <button
                type="button"
                aria-label={`${tab.title} を閉じる`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded-full flex-shrink-0 transition-colors ${
                  isActive
                    ? "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 opacity-60 group-hover:opacity-100"
                }`}
                title="閉じる"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* 新規タブ作成ボタン */}
      {onNewTab && (
        <button
          type="button"
          onClick={onNewTab}
          className="p-1 mx-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 transition-colors flex-shrink-0"
          title="新規ファイルを作成してタブに追加"
          aria-label="新規ファイル作成"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </nav>
  );
};

export default TabBar;
