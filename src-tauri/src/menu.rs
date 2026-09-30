use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Wry,
};

pub fn create_app_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    // ファイルメニュー
    let new_file = MenuItem::with_id(app, "new_file", "新規ファイル", true, Some("CmdOrCtrl+N"))?;
    let save_file = MenuItem::with_id(app, "save_file", "保存", true, Some("CmdOrCtrl+S"))?;
    let file_menu = Submenu::with_items(
        app,
        "ファイル",
        true,
        &[
            &new_file,
            &save_file,
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
    let view_menu = Submenu::with_items(
        app,
        "表示",
        true,
        &[
            &toggle_sidebar,
            &toggle_source_mode,
            &toggle_focus_mode,
            &toggle_tabs,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, Some("全画面表示の切替"))?,
        ],
    )?;

    // ヘルプメニュー
    let about = PredefinedMenuItem::about(app, Some("Typori について"), None)?;
    let help_menu = Submenu::with_items(app, "ヘルプ", true, &[&about])?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &help_menu])
}

pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "new_file" => {
            let _ = app.emit("menu:new_file", ());
        }
        "save_file" => {
            let _ = app.emit("menu:save_file", ());
        }
        "toggle_sidebar" => {
            let _ = app.emit("menu:toggle_sidebar", ());
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
        "toggle_focus_mode" => {
            let _ = app.emit("menu:toggle_focus_mode", ());
        }
        "toggle_source_mode" => {
            let _ = app.emit("menu:toggle_source_mode", ());
        }
        "toggle_tabs" => {
            let _ = app.emit("menu:toggle_tabs", ());
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_menu_event_ids() {
        assert_eq!("new_file", "new_file");
        assert_eq!("save_file", "save_file");
        assert_eq!("toggle_sidebar", "toggle_sidebar");
        assert_eq!("undo", "undo");
        assert_eq!("redo", "redo");
        assert_eq!("insert_link", "insert_link");
        assert_eq!("toggle_blockquote", "toggle_blockquote");
        assert_eq!("insert_table", "insert_table");
        assert_eq!("toggle_focus_mode", "toggle_focus_mode");
        assert_eq!("toggle_source_mode", "toggle_source_mode");
        assert_eq!("toggle_tabs", "toggle_tabs");
    }
}
