import React, { useState, useEffect, useRef } from "react";

export interface LinkTooltipProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  initialHref: string;
  initialText: string;
  isNewLink: boolean;
  onApply: (href: string, text?: string) => void;
  onRemove: () => void;
  onOpenUrl: (href: string) => void;
  onClose: () => void;
}

export const LinkTooltip: React.FC<LinkTooltipProps> = ({
  isOpen,
  position,
  initialHref,
  initialText,
  isNewLink,
  onApply,
  onRemove,
  onOpenUrl,
  onClose,
}) => {
  const [href, setHref] = useState(initialHref);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHref(initialHref);
    setText(initialText);
  }, [initialHref, initialText]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Escape key handler
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

  if (!isOpen || !position) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (href.trim()) {
      onApply(href.trim(), text.trim());
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 flex flex-col gap-2 min-w-[320px] max-w-[420px] text-xs transition-opacity duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {isNewLink && (
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              表示テキスト
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="リンクのテキスト"
              className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            リンク先 URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {href.trim() && (
              <button
                type="button"
                onClick={() => onOpenUrl(href.trim())}
                title="ブラウザで開く"
                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-700/60 mt-1">
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Ctrl+Click でブラウザオープン
          </div>
          <div className="flex items-center gap-1.5">
            {!isNewLink && (
              <button
                type="button"
                onClick={onRemove}
                className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                title="リンクを解除"
              >
                リンク解除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!href.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-medium transition-colors"
            >
              適用
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LinkTooltip;
