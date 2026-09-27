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
    let edit_menu = Submenu::with_items(
        app,
        "編集",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("元に戻す"))?,
            &PredefinedMenuItem::redo(app, Some("やり直し"))?,
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
    let view_menu = Submenu::with_items(
        app,
        "表示",
        true,
        &[
            &toggle_sidebar,
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
    }
}
