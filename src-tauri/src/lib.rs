mod commands;
mod db;
mod file_watcher;

use std::sync::Mutex;
use notify::RecommendedWatcher;

struct WatcherState(Mutex<Option<RecommendedWatcher>>);

#[tauri::command]
async fn start_watching_folder(
    app: tauri::AppHandle,
    folder_path: String,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    let watcher = file_watcher::watch_folder(app, folder_path)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(watcher);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:local_player.db", db::get_migrations())
                .build(),
        )
        .manage(WatcherState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            commands::file::scan_folder,
            commands::file::read_file_bytes,
            commands::file::read_file_header,
            start_watching_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
