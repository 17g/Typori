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
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_cli_args,
            fs::open_file,
            fs::save_file,
            fs::read_dir,
            fs::get_current_dir,
            fs::get_parent_dir,
            fs::create_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
