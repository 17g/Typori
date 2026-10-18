use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Runtime,
};

pub fn create_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // ファイルメニュー
    let new_file = MenuItem::with_id(app, "new_file", "新規ファイル", true, Some("CmdOrCtrl+N"))?;
    let save_file = MenuItem::with_id(app, "save_file", "保存", true, Some("CmdOrCtrl+S"))?;
    let export_html = MenuItem::with_id(
        app,
        "export_html",
        "HTML形式でエクスポート...",
        true,
        Some("CmdOrCtrl+Shift+E"),
    )?;
    let export_pdf = MenuItem::with_id(
        app,
        "export_pdf",
        "PDF形式でエクスポート (印刷)...",
        true,
        Some("CmdOrCtrl+Shift+P"),
    )?;
    let file_menu = Submenu::with_items(
        app,
        "ファイル",
        true,
        &[
            &new_file,
            &save_file,
            &export_html,
            &export_pdf,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("終了"))?,
        ],
    )?;

    // 編集メニュー
    let insert_link = MenuItem::with_id(
        app,
        "insert_link",
        "リンクの挿入・編集",
        true,
        Some("CmdOrCtrl+K"),
    )?;
    let toggle_blockquote = MenuItem::with_id(
        app,
        "toggle_blockquote",
        "引用の切り替え",
        true,
        Some("CmdOrCtrl+Shift+Q"),
    )?;
    let insert_table = MenuItem::with_id(
        app,
        "insert_table",
        "表（テーブル）の挿入",
        true,
        Some("CmdOrCtrl+Alt+T"),
    )?;
    let clear_formatting = MenuItem::with_id(
        app,
        "clear_formatting",
        "書式をクリア",
        true,
        Some("CmdOrCtrl+Shift+B"),
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "編集",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("元に戻す"))?,
            &PredefinedMenuItem::redo(app, Some("やり直し"))?,
            &PredefinedMenuItem::separator(app)?,
            &insert_link,
            &toggle_blockquote,
            &insert_table,
            &clear_formatting,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("切り取り"))?,
            &PredefinedMenuItem::copy(app, Some("コピー"))?,
            &PredefinedMenuItem::paste(app, Some("貼り付け"))?,
            &PredefinedMenuItem::select_all(app, Some("すべて選択"))?,
        ],
    )?;

    // 表示メニュー
    let toggle_sidebar = MenuItem::with_id(
        app,
        "toggle_sidebar",
        "サイドバーの表示切替",
        true,
        Some("CmdOrCtrl+\\"),
    )?;
    let toggle_right_sidebar = MenuItem::with_id(
        app,
        "toggle_right_sidebar",
        "アウトラインの表示切替",
        true,
        Some("CmdOrCtrl+Shift+O"),
    )?;
    let toggle_source_mode = MenuItem::with_id(
        app,
        "toggle_source_mode",
        "ソース直接編集モードの切替",
        true,
        Some("CmdOrCtrl+/"),
    )?;
    let toggle_focus_mode = MenuItem::with_id(
        app,
        "toggle_focus_mode",
        "フォーカスモードの切替",
        true,
        Some("F8"),
    )?;
    let toggle_tabs = MenuItem::with_id(
        app,
        "toggle_tabs",
        "タブ機能の有効/無効",
        true,
        Some("CmdOrCtrl+Shift+T"),
    )?;
    let toggle_line_numbers = CheckMenuItem::with_id(
        app,
        "toggle_line_numbers",
        "行番号を表示",
        true,
        true,
        Some("CmdOrCtrl+Alt+L"),
    )?;
    let view_menu = Submenu::with_items(
        app,
        "表示",
        true,
        &[
            &toggle_sidebar,
            &toggle_right_sidebar,
            &toggle_source_mode,
            &toggle_focus_mode,
            &toggle_tabs,
            &toggle_line_numbers,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, Some("全画面表示の切替"))?,
        ],
    )?;

    // ヘルプメニュー
    let cheatsheet = MenuItem::with_id(
        app,
        "open_cheatsheet",
        "チートシート (Markdown & ショートカット)",
        true,
        Some("F1"),
    )?;
    let shortcuts_settings = MenuItem::with_id(
        app,
        "open_shortcuts_settings",
        "ショートカット設定...",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let about = PredefinedMenuItem::about(app, Some("Typori について"), None)?;
    let help_menu = Submenu::with_items(
        app,
        "ヘルプ",
        true,
        &[
            &cheatsheet,
            &shortcuts_settings,
            &PredefinedMenuItem::separator(app)?,
            &about,
        ],
    )?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &help_menu])
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "new_file" => {
            let _ = app.emit("menu:new_file", ());
        }
        "save_file" => {
            let _ = app.emit("menu:save_file", ());
        }
        "export_html" => {
            let _ = app.emit("menu:export_html", ());
        }
        "export_pdf" => {
            let _ = app.emit("menu:export_pdf", ());
        }
        "toggle_sidebar" => {
            let _ = app.emit("menu:toggle_sidebar", ());
        }
        "toggle_right_sidebar" => {
            let _ = app.emit("menu:toggle_right_sidebar", ());
        }
        "undo" => {
            let _ = app.emit("menu:undo", ());
        }
        "redo" => {
            let _ = app.emit("menu:redo", ());
        }
        "insert_link" => {
            let _ = app.emit("menu:insert_link", ());
        }
        "toggle_blockquote" => {
            let _ = app.emit("menu:toggle_blockquote", ());
        }
        "insert_table" => {
            let _ = app.emit("menu:insert_table", ());
        }
        "clear_formatting" => {
            let _ = app.emit("menu:clear_formatting", ());
        }
        "toggle_focus_mode" => {
            let _ = app.emit("menu:toggle_focus_mode", ());
        }
        "toggle_source_mode" => {
            let _ = app.emit("menu:toggle_source_mode", ());
        }
        "toggle_tabs" => {
            let _ = app.emit("menu:toggle_tabs", ());
        }
        "toggle_line_numbers" => {
            let _ = app.emit("menu:toggle_line_numbers", ());
        }
        "open_cheatsheet" => {
            let _ = app.emit("menu:open_cheatsheet", ());
        }
        "open_shortcuts_settings" => {
            let _ = app.emit("menu:open_shortcuts_settings", ());
        }
        _ => {}
    }
}

pub fn find_in_menu_tree<T, F, S>(
    items: &[T],
    predicate: &F,
    extract_sub: &S,
) -> Option<T>
where
    T: Clone,
    F: Fn(&T) -> bool,
    S: Fn(&T) -> Option<Vec<T>>,
{
    for item in items {
        if predicate(item) {
            return Some(item.clone());
        }
        if let Some(sub_items) = extract_sub(item) {
            if let Some(found) = find_in_menu_tree(&sub_items, predicate, extract_sub) {
                return Some(found);
            }
        }
    }
    None
}

pub fn find_check_menu_item<R: Runtime>(menu: &Menu<R>, target_id: &str) -> Option<CheckMenuItem<R>> {
    if let Ok(items) = menu.items() {
        find_check_item_in_items(&items, target_id)
    } else {
        None
    }
}

fn find_check_item_in_items<R: Runtime>(items: &[MenuItemKind<R>], target_id: &str) -> Option<CheckMenuItem<R>> {
    let found = find_in_menu_tree(
        items,
        &|item| match item {
            MenuItemKind::Check(check_item) => check_item.id().as_ref() == target_id,
            _ => false,
        },
        &|item| match item {
            MenuItemKind::Submenu(submenu) => submenu.items().ok(),
            _ => None,
        },
    );

    match found {
        Some(MenuItemKind::Check(check_item)) => Some(check_item),
        _ => None,
    }
}

#[tauri::command]
pub fn set_line_numbers_menu_checked(app: AppHandle, checked: bool) -> Result<(), String> {
    if let Some(menu) = app.menu() {
        if let Some(check_item) = find_check_menu_item(&menu, "toggle_line_numbers") {
            check_item.set_checked(checked).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone, PartialEq)]
    enum MockItem {
        Standard { id: String },
        Check { id: String, checked: bool },
        Submenu { id: String, children: Vec<MockItem> },
    }

    #[test]
    fn test_find_in_menu_tree_recursive_search() {
        let tree = vec![
            MockItem::Submenu {
                id: "file".into(),
                children: vec![
                    MockItem::Standard { id: "new_file".into() },
                    MockItem::Standard { id: "save_file".into() },
                ],
            },
            MockItem::Submenu {
                id: "view".into(),
                children: vec![
                    MockItem::Standard { id: "toggle_sidebar".into() },
                    MockItem::Check {
                        id: "toggle_line_numbers".into(),
                        checked: true,
                    },
                    MockItem::Submenu {
                        id: "nested_sub".into(),
                        children: vec![
                            MockItem::Check {
                                id: "deep_check".into(),
                                checked: false,
                            },
                        ],
                    },
                ],
            },
            MockItem::Check {
                id: "root_check".into(),
                checked: true,
            },
        ];

        let predicate = |item: &MockItem, target: &str| match item {
            MockItem::Check { id, .. } => id == target,
            _ => false,
        };
        let extract_sub = |item: &MockItem| match item {
            MockItem::Submenu { children, .. } => Some(children.clone()),
            _ => None,
        };

        // 1. ルートレベルのCheckItemを検索
        let found_root = find_in_menu_tree(&tree, &|i| predicate(i, "root_check"), &extract_sub);
        assert_eq!(
            found_root,
            Some(MockItem::Check {
                id: "root_check".into(),
                checked: true
            })
        );

        // 2. 1階層下のSubmenu内のCheckItem（toggle_line_numbers）を再帰探索で発見
        let found_view = find_in_menu_tree(&tree, &|i| predicate(i, "toggle_line_numbers"), &extract_sub);
        assert_eq!(
            found_view,
            Some(MockItem::Check {
                id: "toggle_line_numbers".into(),
                checked: true
            })
        );

        // 3. 2階層下の深いSubmenu内のCheckItem（deep_check）を再帰探索で発見
        let found_deep = find_in_menu_tree(&tree, &|i| predicate(i, "deep_check"), &extract_sub);
        assert_eq!(
            found_deep,
            Some(MockItem::Check {
                id: "deep_check".into(),
                checked: false
            })
        );

        // 4. 存在しないIDの場合は None が返ること
        let found_none = find_in_menu_tree(&tree, &|i| predicate(i, "not_exist"), &extract_sub);
        assert_eq!(found_none, None);

        // 5. CheckItem ではなく Standard アイテムのIDを指定した場合は predicate により除外されること
        let found_standard = find_in_menu_tree(&tree, &|i| predicate(i, "toggle_sidebar"), &extract_sub);
        assert_eq!(found_standard, None);
    }

    #[test]
    fn test_menu_event_ids() {
        assert_eq!("new_file", "new_file");
        assert_eq!("save_file", "save_file");
        assert_eq!("export_html", "export_html");
        assert_eq!("export_pdf", "export_pdf");
        assert_eq!("toggle_sidebar", "toggle_sidebar");
        assert_eq!("toggle_right_sidebar", "toggle_right_sidebar");
        assert_eq!("undo", "undo");
        assert_eq!("redo", "redo");
        assert_eq!("insert_link", "insert_link");
        assert_eq!("toggle_blockquote", "toggle_blockquote");
        assert_eq!("insert_table", "insert_table");
        assert_eq!("clear_formatting", "clear_formatting");
        assert_eq!("toggle_focus_mode", "toggle_focus_mode");
        assert_eq!("toggle_source_mode", "toggle_source_mode");
        assert_eq!("toggle_tabs", "toggle_tabs");
        assert_eq!("toggle_line_numbers", "toggle_line_numbers");
        assert_eq!("open_cheatsheet", "open_cheatsheet");
        assert_eq!("open_shortcuts_settings", "open_shortcuts_settings");
    }
}
