import { useMemo } from "react";

interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

interface OutlineSidebarProps {
  content: string | null;
  isOpen: boolean;
}

function extractOutline(markdown: string): OutlineItem[] {
  const lines = markdown.split('\n');
  const outline: OutlineItem[] = [];
  let inCodeBlock = false;
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (!inCodeBlock) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        outline.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index,
        });
      }
    }
  });
  
  return outline;
}

export default function OutlineSidebar({ content, isOpen }: OutlineSidebarProps) {
  const outline = useMemo(() => {
    if (!content) return [];
    return extractOutline(content);
  }, [content]);

  if (!isOpen) return null;

  return (
    <div
      className={`
        flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800
        transition-all duration-300 ease-in-out w-64 overflow-hidden shrink-0
      `}
    >
      <div className="h-9 px-4 flex items-center shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">アウトライン</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {outline.length === 0 ? (
          <div className="text-xs text-zinc-400 dark:text-zinc-500 p-2 text-center mt-4">
            見出しがありません
          </div>
        ) : (
          <ul className="space-y-1">
            {outline.map((item, idx) => (
              <li
                key={`${item.line}-${idx}`}
                className="text-xs text-zinc-600 dark:text-zinc-400 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded px-2 py-1"
                style={{ paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem` }}
                title={item.text}
                // TODO: クリックで見出しまでスクロールする機能を追加
              >
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
