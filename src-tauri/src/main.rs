// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let _window = app.get_webview_window("main");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ThreadPet desktop companion");
}
