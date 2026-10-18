/**
 * Milkdown / ProseMirror 用 Mermaid ダイアグラムプラグイン
 * 
 * Markdown 内の ```mermaid コードブロックを検知し、
 * Typora ライクなインライン SVG プレビュー表示、クリックによるソース展開編集、
 * 構文エラー耐性ハンドリング、およびテーマ同期を提供します。
 */

import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { $prose } from "@milkdown/kit/utils";
import {
  isMermaidLanguage,
  renderMermaidSvg,
  updateMermaidTheme,
  type MermaidTheme,
} from "../../utils/mermaid";

export const mermaidPluginKey = new PluginKey("mermaidPlugin");

// アクティブな MermaidNodeView インスタンスのレジストリ（Selection 追従・テーマ一括更新用）
export const activeMermaidViews = new Set<MermaidNodeView>();

let globalThemeObserver: MutationObserver | null = null;
let globalThemeEventListener: ((e: Event) => void) | null = null;
let globalRerenderTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * HTML 特殊文字をエスケープします。
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 現在の HTML ドキュメントから適用すべき Mermaid テーマを取得します。
 */
export function getCurrentAppTheme(): MermaidTheme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return "light";
}

/**
 * すべてのアクティブな Mermaid ダイアグラムを指定（または現在の）テーマで一括再レンダリングします。
 */
export async function rerenderAllMermaidDiagrams(targetTheme?: MermaidTheme): Promise<void> {
  const theme = targetTheme ?? getCurrentAppTheme();
  updateMermaidTheme(theme);

  const promises: Promise<void>[] = [];
  activeMermaidViews.forEach((view) => {
    promises.push(view.renderDiagram(theme));
  });
  await Promise.allSettled(promises);
}

/**
 * デバウンス付きで全 Mermaid ダイアグラムの再レンダリングを実行します。
 */
export function scheduleRerenderAllDiagrams(targetTheme?: MermaidTheme): void {
  if (globalRerenderTimer) {
    clearTimeout(globalRerenderTimer);
  }
  globalRerenderTimer = setTimeout(() => {
    rerenderAllMermaidDiagrams(targetTheme);
  }, 50);
}

/**
 * アプリケーション全体のテーマ変更（DOMクラス変化およびtypori:theme-changeイベント）を監視する
 * グローバルリスナーを確立します。
 */
export function ensureGlobalThemeObserver(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  // 1. typori:theme-change イベント監視
  if (!globalThemeEventListener) {
    globalThemeEventListener = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme?: MermaidTheme }>;
      const nextTheme = customEvent.detail?.theme ?? getCurrentAppTheme();
      scheduleRerenderAllDiagrams(nextTheme);
    };
    window.addEventListener("typori:theme-change", globalThemeEventListener);
  }

  // 2. documentElement の class 属性監視 (MutationObserver)
  if (!globalThemeObserver && typeof MutationObserver !== "undefined") {
    globalThemeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          scheduleRerenderAllDiagrams();
          break;
        }
      }
    });
    globalThemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
}

/**
 * グローバルテーマ監視リスナーを解除します。
 */
export function teardownGlobalThemeObserver(): void {
  if (globalThemeEventListener && typeof window !== "undefined") {
    window.removeEventListener("typori:theme-change", globalThemeEventListener);
    globalThemeEventListener = null;
  }
  if (globalThemeObserver) {
    globalThemeObserver.disconnect();
    globalThemeObserver = null;
  }
  if (globalRerenderTimer) {
    clearTimeout(globalRerenderTimer);
    globalRerenderTimer = null;
  }
}

/**
 * Mermaid コードブロック専用の ProseMirror NodeView
 */
export class MermaidNodeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private previewContainer: HTMLElement;
  private sourceWrapper: HTMLElement;
  private headerBar: HTMLElement;
  private statusText: HTMLElement;
  private node: ProseNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private renderVersion: number = 0;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private themeObserver: MutationObserver | null = null;
  private isActive: boolean = false;

  constructor(node: ProseNode, view: EditorView, getPos: () => number | undefined) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    // 1. ルートコンテナ
    this.dom = document.createElement("div");
    this.dom.className =
      "typori-mermaid-container relative my-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all overflow-hidden shadow-sm";

    // 2. ヘッダーバー（ソース編集モード時に展開）
    this.headerBar = document.createElement("div");
    this.headerBar.className =
      "typori-mermaid-header hidden items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 font-mono select-none";

    const titleSpan = document.createElement("div");
    titleSpan.className = "flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300";
    titleSpan.innerHTML = `
      <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
      <span>Mermaid Diagram</span>
    `;

    this.statusText = document.createElement("span");
    this.statusText.className = "text-[11px] text-gray-400";
    this.statusText.textContent = "編集モード (外側クリックでプレビュー)";

    this.headerBar.appendChild(titleSpan);
    this.headerBar.appendChild(this.statusText);

    // 3. ソース編集ラッパー
    this.sourceWrapper = document.createElement("div");
    this.sourceWrapper.className =
      "typori-mermaid-source hidden bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 p-3";

    const preEl = document.createElement("pre");
    preEl.className =
      "typori-mermaid-pre m-0 p-0 bg-transparent text-sm font-mono text-gray-800 dark:text-gray-200 outline-none whitespace-pre-wrap break-all";

    const codeEl = document.createElement("code");
    codeEl.className = "language-mermaid block outline-none";
    preEl.appendChild(codeEl);
    this.sourceWrapper.appendChild(preEl);

    // ProseMirror のテキスト編集対象となる contentDOM
    this.contentDOM = codeEl;

    // 4. プレビューコンテナ
    this.previewContainer = document.createElement("div");
    this.previewContainer.className =
      "typori-mermaid-preview p-4 flex flex-col items-center justify-center overflow-x-auto min-h-[60px] cursor-pointer hover:bg-gray-50/40 dark:hover:bg-gray-800/40 transition-colors";
    this.previewContainer.setAttribute("title", "クリックして Mermaid ソースを編集");

    // プレビュー領域クリックでソース編集モードへ移行
    this.previewContainer.addEventListener("click", (e) => {
      this.handleClickPreview(e);
    });

    // DOM 組み立て
    this.dom.appendChild(this.headerBar);
    this.dom.appendChild(this.sourceWrapper);
    this.dom.appendChild(this.previewContainer);

    // インスタンスをレジストリに追加
    activeMermaidViews.add(this);

    // グローバルテーマ監視の確立と個別監視（バックアップ）
    ensureGlobalThemeObserver();
    this.setupThemeObserver();

    // 初期状態の反映と初回レンダリング
    this.updateActiveState();
    this.renderDiagram();
  }

  /**
   * 現在のノードが Selection（キャレットまたは選択範囲）内にあるか判定します。
   */
  private checkIsActive(): boolean {
    const pos = this.getPos();
    if (typeof pos !== "number") return false;
    const { selection } = this.view.state;
    // ノード全体の範囲 [pos, pos + nodeSize]
    return selection.from >= pos && selection.to <= pos + this.node.nodeSize;
  }

  /**
   * Selection または状態変更に応じて、ソース表示／折りたたみを同期します。
   */
  updateActiveState(): void {
    const active = this.checkIsActive();
    if (this.isActive === active) return;
    this.isActive = active;

    if (active) {
      this.headerBar.classList.remove("hidden");
      this.headerBar.classList.add("flex");
      this.sourceWrapper.classList.remove("hidden");
      this.dom.classList.add("ring-2", "ring-blue-500/30", "border-blue-400", "dark:border-blue-500");
      this.previewContainer.classList.remove("cursor-pointer", "hover:bg-gray-50/40", "dark:hover:bg-gray-800/40");
      this.previewContainer.removeAttribute("title");
    } else {
      this.headerBar.classList.add("hidden");
      this.headerBar.classList.remove("flex");
      this.sourceWrapper.classList.add("hidden");
      this.dom.classList.remove("ring-2", "ring-blue-500/30", "border-blue-400", "dark:border-blue-500");
      this.previewContainer.classList.add("cursor-pointer", "hover:bg-gray-50/40", "dark:hover:bg-gray-800/40");
      this.previewContainer.setAttribute("title", "クリックして Mermaid ソースを編集");
    }
  }

  /**
   * プレビュー領域がクリックされた際、キャレットをこのコードブロック内に移動してソースを展開します。
   */
  private handleClickPreview(e: MouseEvent): void {
    if (this.checkIsActive()) return;
    const pos = this.getPos();
    if (typeof pos !== "number") return;

    e.preventDefault();
    e.stopPropagation();

    // ノードのテキスト先頭位置 (pos + 1) へキャレットを移動
    const targetPos = Math.min(pos + 1, this.view.state.doc.content.size);
    try {
      const tr = this.view.state.tr.setSelection(
        TextSelection.near(this.view.state.doc.resolve(targetPos))
      );
      this.view.dispatch(tr);
      this.view.focus();
      this.updateActiveState();
    } catch {
      // ignore
    }
  }

  /**
   * デバウンス付きで Mermaid ダイアグラムのレンダリングをスケジュールします。
   */
  private scheduleRender(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
    }
    this.renderTimer = setTimeout(() => {
      this.renderDiagram();
    }, 150);
  }

  /**
   * Mermaid ダイアグラムを SVG レンダリングしてプレビュー領域に反映します。
   * 
   * @param targetTheme 明示的に適用するテーマ。省略時は現在のアプリテーマを使用
   */
  async renderDiagram(targetTheme?: MermaidTheme): Promise<void> {
    const currentVersion = ++this.renderVersion;
    const code = this.node.textContent.trim();

    if (!code) {
      this.previewContainer.innerHTML = `
        <div class="text-xs text-gray-400 dark:text-gray-500 italic py-2">
          Mermaid コードを入力してください (例: graph TB; A--&gt;B;)
        </div>
      `;
      return;
    }

    const theme = targetTheme ?? getCurrentAppTheme();
    const result = await renderMermaidSvg(code, theme);

    // 非同期処理中に新しいレンダリングが開始された場合は破棄
    if (currentVersion !== this.renderVersion) {
      return;
    }

    if (result.success && result.svg) {
      this.previewContainer.innerHTML = result.svg;
      const svgEl = this.previewContainer.querySelector("svg");
      if (svgEl) {
        svgEl.classList.add("max-w-full", "h-auto");
        svgEl.style.maxWidth = "100%";
      }
    } else {
      // 構文エラー耐性ハンドリング: エディタを壊さずに控えめなエラーメッセージを表示
      const errorMsg = escapeHtml(result.error || "構文エラーが発生しました。");
      this.previewContainer.innerHTML = `
        <div class="typori-mermaid-error w-full p-3 my-1 rounded border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-mono overflow-x-auto select-text">
          <div class="font-semibold flex items-center gap-1.5 mb-1 text-red-700 dark:text-red-300">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Mermaid 構文エラー</span>
          </div>
          <pre class="whitespace-pre-wrap text-[11px] leading-relaxed opacity-90 m-0">${errorMsg}</pre>
        </div>
      `;
    }
  }

  /**
   * HTML の dark クラス変化を監視し、テーマ切り替え時にダイアグラムを再レンダリングします。
   */
  private setupThemeObserver(): void {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
      return;
    }
    this.themeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          this.scheduleRender();
          break;
        }
      }
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  /**
   * Selection 変更時のフック（プラグインの update から呼び出し）
   */
  onSelectionChange(): void {
    this.updateActiveState();
  }

  /**
   * ProseMirror からのノード更新要求
   */
  update(node: ProseNode): boolean {
    if (node.type !== this.node.type || !isMermaidLanguage(node.attrs.language)) {
      return false;
    }
    const textChanged = this.node.textContent !== node.textContent;
    this.node = node;

    if (textChanged) {
      this.scheduleRender();
    }
    this.updateActiveState();
    return true;
  }

  /**
   * contentDOM 以外の DOM 変更による ProseMirror の不要な状態破壊・再描画を防止
   */
  ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Node }): boolean {
    if (!this.contentDOM) return true;
    return !this.contentDOM.contains(mutation.target);
  }

  /**
   * プレビュー領域等の特定イベントの ProseMirror 伝播を制御
   */
  stopEvent(event: Event): boolean {
    if (this.previewContainer.contains(event.target as Node)) {
      if (event.type === "click" || event.type === "mousedown") {
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * ノード破棄時のリソース解放
   */
  destroy(): void {
    activeMermaidViews.delete(this);
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (activeMermaidViews.size === 0) {
      teardownGlobalThemeObserver();
    }
  }
}

/**
 * Milkdown / ProseMirror 用 Mermaid プラグイン定義
 */
export const mermaidPlugin = $prose(() => {
  return new Plugin({
    key: mermaidPluginKey,
    props: {
      nodeViews: {
        code_block: ((node: ProseNode, view: EditorView, getPos: () => number | undefined) => {
          if (isMermaidLanguage(node.attrs.language)) {
            return new MermaidNodeView(node, view, getPos);
          }
          // mermaid 以外の通常のコードブロックはデフォルト表示を維持
          return undefined;
        }) as any,
      },
    },
    view() {
      ensureGlobalThemeObserver();
      return {
        update(view, prevState) {
          // selection または doc が更新された場合、すべての MermaidNodeView のアクティブ状態を同期
          if (!prevState || !prevState.selection.eq(view.state.selection)) {
            activeMermaidViews.forEach((nodeView) => {
              nodeView.onSelectionChange();
            });
          }
        },
        destroy() {
          activeMermaidViews.clear();
          teardownGlobalThemeObserver();
        },
      };
    },
  });
});
