import React from "react";

export interface TableFloatingToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onDeleteRow: () => void;
  onAddColBefore: () => void;
  onAddColAfter: () => void;
  onDeleteCol: () => void;
  onDeleteTable: () => void;
}

export const TableFloatingToolbar: React.FC<TableFloatingToolbarProps> = ({
  isOpen,
  position,
  onAddRowBefore,
  onAddRowAfter,
  onDeleteRow,
  onAddColBefore,
  onAddColAfter,
  onDeleteCol,
  onDeleteTable,
}) => {
  if (!isOpen || !position) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="typori-table-floating-toolbar z-30 flex items-center gap-0.5 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md px-1.5 py-1 rounded-lg border border-zinc-200/90 dark:border-zinc-700/90 shadow-md text-xs select-none transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      {/* 行操作 */}
      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">行</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddRowBefore();
        }}
        title="上に行を追加"
        className="px-1.5 py-1 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span>+上</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddRowAfter();
        }}
        title="下に行を追加"
        className="px-1.5 py-1 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span>+下</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteRow();
        }}
        title="現在の行を削除"
        className="px-1.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>削除</span>
      </button>

      <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* 列操作 */}
      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">列</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddColBefore();
        }}
        title="左に列を追加"
        className="px-1.5 py-1 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>+左</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddColAfter();
        }}
        title="右に列を追加"
        className="px-1.5 py-1 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <span>+右</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteCol();
        }}
        title="現在の列を削除"
        className="px-1.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors flex items-center gap-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>削除</span>
      </button>

      <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* 表削除 */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteTable();
        }}
        title="表全体を削除"
        className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors flex items-center"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

export default TableFloatingToolbar;
