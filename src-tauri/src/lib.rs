use tauri::Emitter;
use tauri::Manager;

pub mod fs;
pub mod menu;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_menu = menu::create_app_menu(app.handle())?;
            app.set_menu(app_menu)?;

            // 起動セーフティフォールバック: フロントエンドの初期化遅延やエラー時でも
            // ウィンドウが非表示のまま永久に固まらないよう、一定時間経過後に自動で show() を呼び出す
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Some(window) = handle.get_webview_window("main") {
                    if let Ok(false) = window.is_visible() {
                        let _ = window.show();
                    }
                }
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("window:close_requested", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_cli_args,
            fs::open_file,
            fs::save_file,
            fs::read_dir,
            fs::get_current_dir,
            fs::get_parent_dir,
            fs::create_file,
            fs::save_image_file,
            fs::save_image_binary,
            fs::read_file_binary,
            fs::resolve_image_path,
            fs::search_files,
            fs::convert_markdown_to_html,
            fs::export_to_html,
            fs::export_to_pdf_html,
            fs::init_workspace,
            menu::set_line_numbers_menu_checked
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
