---
title: Architecture
---

## Runtime Boundaries

Local Player uses a hybrid desktop architecture:

- **React frontend (`src/`)**: UI rendering, store management, audio orchestration.
- **Rust backend (`src-tauri/src/`)**: filesystem operations, watch service, command bridge, SQLite migrations registration.
- **Tauri bridge**: typed `invoke` calls and event listeners.

## High-Level Flow

1. Frontend loads settings and existing library records.
2. User selects folder/files in settings modal.
3. Frontend invokes `scan_folder` and then processes each file with metadata extraction.
4. Frontend persists records using SQLite plugin (`@tauri-apps/plugin-sql`).
5. Frontend invokes `start_watching_folder`; Rust emits file events for real-time updates.
6. Playback uses Howler.js, with Web Audio analyser/equalizer graph attached.

## Key Subsystems

### UI and Navigation

- `src/components/PlayerShell.tsx` is the orchestration shell.
- Active view routing is app-local state (`player`, `library`, `playlists`) in `uiStore`.
- Settings modal drives monitored folder and theme/visualizer preferences.

### State Management

Zustand stores partition concerns:

- `libraryStore`: track list, source filter, search filter
- `playerStore`: current track, playback context, queue/progress/volume
- `playlistStore`: playlists and selected playlist tracks
- `settingsStore`: folder, theme, equalizer, visualizer colors
- `uiStore`: view and modal visibility state

### Audio Pipeline

- `AudioService` wraps Howler playback lifecycle.
- A Web Audio graph is constructed for analyser and 10-band EQ processing.
- Stereo analysers feed waveform and VU meter visualizations.

### Data and Persistence

- SQLite schema is defined in `src-tauri/src/db/schema.sql` and loaded as migration.
- Frontend DB service (`src/services/database.ts`) performs all CRUD queries.
- App settings are persisted as key/value rows in `settings` table.

## Deployment Topology

- Desktop binaries are published through GitHub Releases.
- `release-manifest.json` + `checksums.txt` are generated during release workflow.
- Documentation site is static and intended for Vercel Git-based deployments from `website/`.
