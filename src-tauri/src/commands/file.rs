use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }

    let mut mp3_files = Vec::new();
    collect_mp3s(path, &mut mp3_files).map_err(|e| e.to_string())?;
    Ok(mp3_files)
}

fn collect_mp3s(dir: &Path, mp3_files: &mut Vec<String>) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_mp3s(&path, mp3_files)?;
        } else if let Some(ext) = path.extension() {
            if ext.eq_ignore_ascii_case("mp3") {
                mp3_files.push(path.to_string_lossy().to_string());
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn read_file_bytes(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path).map_err(|e| format!("Failed to read {}: {}", file_path, e))
}
