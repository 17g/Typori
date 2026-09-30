import { useState, useEffect, useMemo, FC, useCallback } from "react";
import {
  SHORTCUT_ITEMS,
  ShortcutCategory,
  ShortcutConfig,
  CATEGORY_LABELS,
  ShortcutItem,
} from "./types";
import {
  getDefaultShortcutConfig,
  areKeysEqual,
  parseKeyboardEvent,
  findConflictingAction,
  findAllConflicts,
} from "./utils";

interface ShortcutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: ShortcutConfig;
  onSave?: (newConfig: ShortcutConfig) => void;
}

export const ShortcutSettingsModal: FC<ShortcutSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  // 現在の設定状態（ローカル状態）
  const [config, setConfig] = useState<ShortcutConfig>(() => {
    return currentConfig ? { ...currentConfig } : getDefaultShortcutConfig();
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>("all");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [previewKeys, setPreviewKeys] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: "info" | "warning" | "success";
    text: string;
  } | null>(null);

  // currentConfig が変化した場合は同期
  useEffect(() => {
    if (currentConfig) {
      setConfig({ ...currentConfig });
    } else {
      setConfig(getDefaultShortcutConfig());
    }
  }, [currentConfig, isOpen]);

  // モーダルオープン時に検索とカテゴリを初期化
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
      setRecordingId(null);
      setPreviewKeys([]);
      setStatusMessage(null);
    }
  }, [isOpen]);

  // キー入力レコーディング（recordingId がセットされている時）
  useEffect(() => {
    if (!isOpen || !recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escキー単体で録音キャンセル
      if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        setRecordingId(null);
        setPreviewKeys([]);
        setStatusMessage({
          type: "info",
          text: "キー入力の待機をキャンセルしました。",
        });
        return;
      }

      const parsed = parseKeyboardEvent(e);

      if (parsed.isComplete) {
        // 主キーが押されてショートカットキーが確定
        const newKeys = parsed.keys;
        const conflictingActionId = findConflictingAction(recordingId, newKeys, config);

        setConfig((prev) => ({
          ...prev,
          [recordingId]: newKeys,
        }));

        setRecordingId(null);
        setPreviewKeys([]);

        if (conflictingActionId) {
          const conflictItem = SHORTCUT_ITEMS.find((item) => item.id === conflictingActionId);
          setStatusMessage({
            type: "warning",
            text: `⚠️ 設定されたキーは「${conflictItem?.name ?? conflictingActionId}」と重複しています。`,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: `ショートカットを更新しました。`,
          });
        }
      } else {
        // 修飾キーのみが押されている状態（プレビュー更新）
        setPreviewKeys(parsed.modifiers);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // 録音中にキーを離したとき、修飾キーのみの状態ならプレビューを再計算
      if (!recordingId) return;
      const parsed = parseKeyboardEvent(e);
      setPreviewKeys(parsed.modifiers);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [isOpen, recordingId, config]);

  // モーダル全体の Esc キー対応（録音中以外）
  useEffect(() => {
    if (!isOpen || recordingId !== null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, recordingId, onClose]);

  // 個別アイテムをデフォルトに戻す
  const handleResetItem = useCallback((item: ShortcutItem) => {
    setConfig((prev) => ({
      ...prev,
      [item.id]: [...item.defaultKeys],
    }));
    setStatusMessage({
      type: "info",
      text: `「${item.name}」をデフォルト設定に戻しました。`,
    });
  }, []);

  // すべてをデフォルトに戻す
  const handleResetAll = useCallback(() => {
    if (window.confirm("すべてのショートカットキーを初期設定に戻しますか？")) {
      setConfig(getDefaultShortcutConfig());
      setStatusMessage({
        type: "info",
        text: "すべてのショートカットキーを初期設定に戻しました。",
      });
    }
  }, []);

  // キーの無効化（クリア）
  const handleClearItem = useCallback((item: ShortcutItem) => {
    setConfig((prev) => ({
      ...prev,
      [item.id]: [],
    }));
    setStatusMessage({
      type: "info",
      text: `「${item.name}」のショートカットを解除しました。`,
    });
  }, []);

  // 設定の保存とクローズ
  const handleSaveAndClose = useCallback(() => {
    if (onSave) {
      onSave(config);
    }
    onClose();
  }, [config, onSave, onClose]);

  // フィルタリング処理
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SHORTCUT_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const currentKeys = config[item.id] || [];
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.defaultKeys.some((k) => k.toLowerCase().includes(q)) ||
        currentKeys.some((k) => k.toLowerCase().includes(q));

      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery, config]);

  // 全体の競合（重複）リスト
  const allConflicts = useMemo(() => {
    return findAllConflicts(config);
  }, [config]);

  // デフォルトから変更されている項目数
  const customizedCount = useMemo(() => {
    return SHORTCUT_ITEMS.filter((item) => {
      const currentKeys = config[item.id] || [];
      return !areKeysEqual(currentKeys, item.defaultKeys);
    }).length;
  }, [config]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ショートカットキー設定"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (recordingId) {
          setRecordingId(null);
          setPreviewKeys([]);
        } else {
          onClose();
        }
      }}
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold leading-none">
                  ショートカットキー設定
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  各種機能のショートカットキーを自由にカスタマイズできます
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {customizedCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                  title="すべてのショートカットをデフォルト値にリセット"
                >
                  すべて初期化
                </button>
              )}
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
          </div>

          {/* 検索バー & カテゴリフィルター */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* 検索入力 */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
                <svg
                  className="w-4 h-4"
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
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="機能名やキーで検索..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-zinc-400 dark:placeholder-zinc-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* カテゴリ選択タブ */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                ["all", "file", "view", "format", "edit"] as ShortcutCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* ステータス / 警告メッセージ */}
          {statusMessage && (
            <div
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center justify-between border ${
                statusMessage.type === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
                  : statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
              }`}
            >
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="ml-2 hover:opacity-70 font-semibold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 重複・競合の全体警告 */}
          {allConflicts.length > 0 && !statusMessage && (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>
                {allConflicts.length} 箇所のキーバインド競合が検出されています。競合するアクションを確認してください。
              </span>
            </div>
          )}
        </div>

        {/* リストエリア */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
              <svg
                className="w-10 h-10 mb-2 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">
                条件に一致するショートカットが見つかりません
              </p>
              <p className="text-xs mt-1">検索条件を変更してみてください</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const currentKeys = config[item.id] || [];
              const isDefault = areKeysEqual(currentKeys, item.defaultKeys);
              const isRecording = recordingId === item.id;
              const hasConflict = allConflicts.some(
                (c) => c.actionId === item.id || c.conflictingActionId === item.id
              );

              return (
                <div
                  key={item.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg px-2 -mx-2 transition-colors ${
                    isRecording
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/40"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  {/* アクション情報 */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {!isDefault && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                          変更済み
                        </span>
                      )}
                      {hasConflict && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
                          競合中
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>

                  {/* キーバインド & 操作ボタン */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isRecording ? (
                      /* 録音中UI */
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-medium animate-pulse shadow-xs">
                        <span>キーを入力してください...</span>
                        {previewKeys.length > 0 && (
                          <div className="flex items-center gap-1 ml-1.5">
                            {previewKeys.map((k, idx) => (
                              <kbd
                                key={idx}
                                className="px-1.5 py-0.5 text-[10px] bg-indigo-800 rounded font-mono"
                              >
                                {k}
                              </kbd>
                            ))}
                            <span className="text-indigo-200">+ ...</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setRecordingId(null);
                            setPreviewKeys([]);
                          }}
                          className="ml-2 text-[10px] bg-indigo-700 hover:bg-indigo-800 px-1 rounded text-indigo-100"
                        >
                          取消 (Esc)
                        </button>
                      </div>
                    ) : (
                      /* 通常のキーバインド表示 */
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRecordingId(item.id);
                            setPreviewKeys([]);
                            setStatusMessage(null);
                          }}
                          className={`group flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer ${
                            hasConflict
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300"
                              : "bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30"
                          }`}
                          title="クリックして新しいキーバインドを設定"
                        >
                          {currentKeys.length > 0 ? (
                            currentKeys.map((k, kIdx) => (
                              <span key={kIdx} className="flex items-center">
                                {kIdx > 0 && (
                                  <span className="text-zinc-400 dark:text-zinc-600 mx-0.5">
                                    +
                                  </span>
                                )}
                                <kbd className="px-1.5 py-0.5 rounded text-[11px] bg-white dark:bg-zinc-700 shadow-2xs font-semibold">
                                  {k}
                                </kbd>
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 text-[11px] italic">
                              未設定
                            </span>
                          )}

                          <span className="ml-1 opacity-0 group-hover:opacity-100 text-[10px] text-indigo-500 transition-opacity">
                            ✎
                          </span>
                        </button>

                        {/* 個別リセットボタン */}
                        {!isDefault && (
                          <button
                            onClick={() => handleResetItem(item)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="デフォルトに戻す"
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        )}

                        {/* クリアボタン */}
                        {currentKeys.length > 0 && (
                          <button
                            onClick={() => handleClearItem(item)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="キーバインドを解除"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-3">
            <span>
              全 {SHORTCUT_ITEMS.length} 項目中 {customizedCount} 項目を変更済み
            </span>
            <span>•</span>
            <span>行のキーをクリックして新しいキーを押してください</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              設定を適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
