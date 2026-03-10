---
title: Data Model
---

## SQLite Database

Connection string used by frontend DB service:

- `sqlite:local_player.db`

Schema source:

- `src-tauri/src/db/schema.sql`

## Tables

### `tracks`

Fields include:

- core metadata: `title`, `artist`, `album`, `year`, `genre`, `duration`
- location/source: `file_path`, `source` (`local`, `s3`, `drive`)
- artwork: `album_art_url`
- timestamps: `created_at`, `updated_at`

Indexes:

- `idx_tracks_source`
- `idx_tracks_artist`
- `idx_tracks_album`

### `playlists`

Fields:

- `id`, `name`, `created_at`, `updated_at`

### `playlist_tracks`

Fields:

- `playlist_id`, `track_id`, `position`, `created_at`

Constraints:

- Foreign keys to `playlists` and `tracks` with cascade delete

Index:

- `idx_playlist_tracks_playlist`

### `settings`

Key/value table:

- `key` (primary key)
- `value`
- `updated_at`

## Settings Keys in Use

Persisted from frontend orchestration:

- `monitored_folder`
- `theme_mode`
- `equalizer_state`
- `visualizer_colors`

## Release Manifest Contract

Schema file:

- `docs/release-manifest.schema.json`

Manifest includes:

- `schemaVersion`
- `generatedAt`
- `version`
- `artifacts[]` containing `os`, `arch`, `fileName`, `sha256`, `downloadUrl`
