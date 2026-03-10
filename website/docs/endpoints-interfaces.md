---
title: Endpoints & Interfaces
---

## Tauri Invoke Commands

Frontend wrappers are defined in `src/services/tauriCommands.ts`.

| Command | Parameters | Return Type | Producer | Consumer |
| --- | --- | --- | --- | --- |
| `scan_folder` | `folderPath: string` | `string[]` | Rust (`commands/file.rs`) | Frontend import flow |
| `start_watching_folder` | `folderPath: string` | `void` | Rust (`lib.rs`) | Frontend folder watch startup |
| `read_file_bytes` | `filePath: string` | `number[]` | Rust (`commands/file.rs`) | Frontend playback fallback loading |
| `read_file_header` | `filePath: string`, `maxBytes?: number` | `number[]` | Rust (`commands/file.rs`) | Frontend ID3 parsing during imports |

## Emitted Tauri Events

| Event | Payload | Emitted By | Handled In |
| --- | --- | --- | --- |
| `file-created` | file path string | Rust watcher (`file_watcher/mod.rs`) | `PlayerShell.tsx` listener to import new file |
| `file-deleted` | file path string | Rust watcher (`file_watcher/mod.rs`) | Event currently emitted; deletion handling extension point |

## SQLite Interface

Frontend accesses SQLite using `@tauri-apps/plugin-sql` in `src/services/database.ts`.

Key operations:

- Track CRUD and lookup by file path
- Playlist CRUD and playlist-track joins
- Settings get/set key-value operations

## Release Asset Endpoint Contract

The release workflow generates manifest links with this base:

```text
https://github.com/<owner>/<repo>/releases/download/<tag>/<fileName>
```

Workflow computes:

- `BASE_URL="https://github.com/${GITHUB_REPOSITORY}/releases/download/${GITHUB_REF_NAME}"`

Then writes:

- `release-manifest.json`
- `checksums.txt`

## External Services Used by Current Implementation

Implemented runtime surfaces:

- GitHub Releases (artifact hosting + manifest URLs)
- Vercel (documentation hosting target)

Not currently implemented in runtime code:

- AWS S3 playback integration
- Google Drive playback integration

These are tracked in [Roadmap](./roadmap.md).
