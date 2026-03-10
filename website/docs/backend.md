---
title: Backend
---

## Rust/Tauri Runtime

Backend entrypoints:

- `src-tauri/src/main.rs`: launches `local_player_lib::run()`
- `src-tauri/src/lib.rs`: builder setup, plugins, commands, watcher state

## Registered Tauri Plugins

From `src-tauri/src/lib.rs`:

- `tauri-plugin-opener`
- `tauri-plugin-dialog`
- `tauri-plugin-fs`
- `tauri-plugin-sql` with migration registration for `sqlite:local_player.db`

## Command Surface

### File Commands (`src-tauri/src/commands/file.rs`)

- `scan_folder(folder_path: String) -> Result<Vec<String>, String>`
- `read_file_bytes(file_path: String) -> Result<Vec<u8>, String>`
- `read_file_header(file_path: String, max_bytes: usize) -> Result<Vec<u8>, String>`

### Watcher Start Command (`src-tauri/src/lib.rs`)

- `start_watching_folder(app, folder_path, state) -> Result<(), String>`
- Maintains a watcher instance in managed state (`WatcherState`) to keep it alive

## File Watcher

`src-tauri/src/file_watcher/mod.rs`:

- Uses `notify` crate recursive watch mode
- Emits frontend events via app handle:
  - `file-created` for new `.mp3` files
  - `file-deleted` for removed paths

## Database Migration Registration

`src-tauri/src/db/mod.rs` returns migration list with:

- version `1`
- SQL loaded from `schema.sql`

This migration creates `tracks`, `playlists`, `playlist_tracks`, and `settings` tables.

## Security-Relevant Notes

- Command exposure is explicit via `invoke_handler` allowlist.
- CSP is configured in `src-tauri/tauri.conf.json`.
- App identifier and bundle metadata are set in `tauri.conf.json`.
