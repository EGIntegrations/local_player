use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind, Config};
use std::path::Path;
use tauri::{AppHandle, Emitter};

pub fn watch_folder(app: AppHandle, folder_path: String) -> Result<RecommendedWatcher, String> {
    let app_handle = app.clone();

    let mut watcher: RecommendedWatcher = Watcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) => {
                        for path in &event.paths {
                            if let Some(ext) = path.extension() {
                                if ext.eq_ignore_ascii_case("mp3") {
                                    let path_str = path.to_string_lossy().to_string();
                                    let _ = app_handle.emit("file-created", path_str);
                                }
                            }
                        }
                    }
                    EventKind::Remove(_) => {
                        for path in &event.paths {
                            let path_str = path.to_string_lossy().to_string();
                            let _ = app_handle.emit("file-deleted", path_str);
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&folder_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    Ok(watcher)
}
