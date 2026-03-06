# Local Player - Design Document

**Date**: 2026-03-06
**Project**: Local Player - Retro-Futurism Music Player
**Platform**: macOS (Windows later)
**Tech Stack**: Tauri 2.x + React 18 + Rust

---

## Overview

Local Player is a desktop music player with a retro-futurism aesthetic inspired by Perplexity's cosmic branding. It plays MP3 files from local folders and cloud sources (S3, Google Drive) with a toggleable mini/expanded interface featuring waveform visualizations and analog VU meters.

**Core Philosophy**: Local-first, cloud-optional. Clean modern grid layout with vintage audio equipment details and cosmic imagery.

---

## Design Aesthetic

**Visual Style**: Retro-futurism meets vintage audio equipment
- Cosmic backgrounds (stars, nebulae) with geometric grid overlays
- Color palette: Warm oranges (#A84B2F, apricot) + cool blues/teals (#0B363C, #DEF7F9)
- Typography: Monospace fonts (Berkeley Mono style) for technical elements
- UI elements: Analog VU meters, vintage knobs, clean modern grid structure
- Subtle animations: Twinkling stars, pulsing geometric shapes

**Reference**: Perplexity AI branding - cosmic imagery with structured geometric overlays

---

## 1. Architecture Overview

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + CSS Modules
- Zustand (state management)
- Howler.js (audio playback)
- jsmediatags (ID3 parsing)
- Web Audio API (visualizations)

**Backend:**
- Rust (Tauri commands)
- Tauri 2.x framework
- SQLite (via Tauri SQL plugin)
- notify crate (file watching)
- AWS SDK for Rust (S3 integration)
- Google Drive API (Drive integration)

### Directory Structure

```
local_player/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri app entry point
│   │   ├── commands/       # Tauri commands module
│   │   │   ├── file.rs     # File system operations
│   │   │   ├── cloud.rs    # S3/Drive integration
│   │   │   └── db.rs       # SQLite operations
│   │   ├── file_watcher/   # Folder monitoring
│   │   │   └── mod.rs
│   │   ├── cloud/          # Cloud provider integrations
│   │   │   ├── s3.rs
│   │   │   └── drive.rs
│   │   └── db/             # Database schema & queries
│   │       ├── schema.rs
│   │       └── queries.rs
│   └── Cargo.toml
│
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── player/         # Player components
│   │   │   ├── MiniPlayer.tsx
│   │   │   ├── ExpandedPlayer.tsx
│   │   │   ├── AlbumArt.tsx
│   │   │   ├── PlaybackControls.tsx
│   │   │   ├── VolumeControl.tsx
│   │   │   └── SeekBar.tsx
│   │   ├── visualizations/ # Audio visualizations
│   │   │   ├── Waveform.tsx
│   │   │   └── VUMeters.tsx
│   │   ├── library/        # Library components
│   │   │   ├── Library.tsx
│   │   │   ├── TrackList.tsx
│   │   │   ├── SourceFilter.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── playlists/      # Playlist components
│   │   │   ├── PlaylistManager.tsx
│   │   │   ├── PlaylistList.tsx
│   │   │   └── CreatePlaylist.tsx
│   │   ├── settings/       # Settings modal
│   │   │   ├── Settings.tsx
│   │   │   ├── FolderSelection.tsx
│   │   │   ├── S3Config.tsx
│   │   │   └── DriveAuth.tsx
│   │   └── PlayerShell.tsx # Main container with cosmic background
│   ├── stores/             # Zustand stores
│   │   ├── playerStore.ts
│   │   ├── libraryStore.ts
│   │   ├── playlistStore.ts
│   │   ├── settingsStore.ts
│   │   └── uiStore.ts
│   ├── services/           # Business logic
│   │   ├── audioService.ts
│   │   ├── id3Parser.ts
│   │   └── tauriCommands.ts
│   ├── types/              # TypeScript types
│   │   ├── track.ts
│   │   ├── playlist.ts
│   │   └── settings.ts
│   ├── assets/             # Images, fonts, branding
│   │   ├── backgrounds/
│   │   └── fonts/
│   ├── App.tsx
│   └── main.tsx
│
├── docs/
│   └── plans/
└── package.json
```

### Architectural Principles

1. **Security First**: All sensitive operations (credentials, file I/O, cloud APIs) happen in Rust backend
2. **Separation of Concerns**: Frontend handles UI/audio, backend handles data/security
3. **Type Safety**: Full TypeScript + Rust type safety across the bridge
4. **Performance**: Virtualized lists, lazy loading, efficient state updates
5. **Offline-First**: Local playback always works, cloud is optional enhancement

---

## 2. Component Structure

### Main Components

```
App
├── PlayerShell (cosmic background, geometric overlays)
│   ├── MiniPlayer (collapsible state)
│   │   ├── AlbumArt (large, centered)
│   │   ├── TrackInfo (title, artist, album)
│   │   ├── PlaybackControls (play/pause/skip/back)
│   │   ├── VolumeControl
│   │   └── SeekBar (progress + click to seek)
│   │
│   └── ExpandedPlayer
│       ├── AlbumArt (smaller, left side)
│       ├── Visualizations
│       │   ├── Waveform (full song waveform)
│       │   └── VUMeters (analog-style, stereo)
│       ├── TrackInfo (expanded metadata)
│       ├── PlaybackControls (same as mini)
│       ├── VolumeControl (with analog knob visual)
│       └── SeekBar
│
├── Library (sidebar or overlay)
│   ├── SourceFilter (Local/S3/Drive tabs)
│   ├── SearchBar
│   ├── TrackList (virtualized for performance)
│   └── PlaylistPanel
│
├── Settings (modal or separate view)
│   ├── FolderSelection (choose monitored folder)
│   ├── S3Config (access key, secret, bucket)
│   └── DriveAuth (OAuth flow button)
│
└── PlaylistManager
    ├── PlaylistList (saved playlists)
    ├── CreatePlaylist
    └── EditPlaylist
```

### State Management (Zustand Stores)

**usePlayerStore:**
- Current track
- Playback state (playing, paused, stopped)
- Volume level
- Progress (current time, duration)
- Queue (upcoming tracks)

**useLibraryStore:**
- All tracks (local + S3 + Drive)
- Filtered/searched tracks
- Sort preferences
- Source filter (Local/S3/Drive/All)

**usePlaylistStore:**
- Saved playlists
- Active playlist
- Playlist tracks

**useSettingsStore:**
- Monitored folder path
- S3 credentials status
- Drive auth status
- Theme preferences

**useUIStore:**
- Mini/expanded mode toggle
- Settings modal visibility
- Active view (player, library, playlists)

### Key UI Features

1. **Toggle Mini/Expanded**: Button switches between compact and full visualization modes
2. **Cosmic Background**: Animated starfield with subtle parallax
3. **Geometric Overlays**: Grid lines that pulse subtly with audio
4. **Vintage Elements**: Analog VU meters, rotary volume knobs, cassette-style transport controls
5. **Color Accents**: Orange/blue gradients on active elements, hover states

---

## 3. Data Flow

### Initial Setup Flow

```
1. User opens app
2. Check settings: Is folder configured?
   ├─ No → Show settings modal (first-run experience)
   └─ Yes → Start file watcher (Rust background process)
3. File watcher scans monitored folder
   └─ Finds all .mp3 files recursively
4. For each MP3 file:
   ├─ Rust sends file path to frontend via Tauri event
   ├─ Frontend loads file ArrayBuffer
   ├─ Frontend parses ID3 tags (jsmediatags)
   │   └─ Extract: title, artist, album, year, genre, album art
   ├─ Frontend sends metadata back to Rust via command
   └─ Rust stores track in SQLite
5. Library loads from SQLite
   └─ Display tracks in UI
```

### Cloud Integration Flow

**S3 Integration:**
```
1. User enters credentials in settings:
   - Access Key ID
   - Secret Access Key
   - Bucket name
   - Optional: region, prefix path
2. Rust validates credentials (test list operation)
3. Rust stores credentials encrypted in system keychain
4. Rust lists bucket contents → filters .mp3 files
5. For each S3 object:
   ├─ Store metadata in SQLite with source='s3'
   └─ Generate thumbnail URL if available
6. When playing S3 track:
   ├─ Frontend requests presigned URL from Rust
   ├─ Rust generates temporary URL (expires in 1 hour)
   └─ Frontend streams via Howler.js
```

**Google Drive Integration:**
```
1. User clicks "Connect Google Drive" in settings
2. Rust initiates OAuth 2.0 flow:
   ├─ Opens browser to Google consent screen
   └─ Listens for callback on localhost
3. User authorizes app
4. Rust receives OAuth tokens
5. Rust stores tokens encrypted in system keychain
6. Rust lists Drive files (filter: mimeType contains 'audio')
7. For each Drive file:
   ├─ Store metadata in SQLite with source='drive'
   └─ Cache Drive file ID
8. When playing Drive track:
   ├─ Frontend requests stream URL from Rust
   ├─ Rust uses OAuth token to fetch file stream
   └─ Frontend streams via Howler.js
```

### Playback Flow

```
1. User clicks track in library
2. Frontend checks track source:
   ├─ Local: Use direct file:// path
   ├─ S3: Request presigned URL from Rust command
   └─ Drive: Request stream URL from Rust command
3. Initialize Howler.js with audio URL
4. Connect to Web Audio API for analysis:
   ├─ Create AnalyserNode
   ├─ Generate waveform data (for seek bar)
   └─ Feed real-time data to VU meters
5. Update playerStore:
   ├─ Set current track
   ├─ Set playing state
   └─ Start progress interval (update every 100ms)
6. UI components react to store changes:
   ├─ AlbumArt displays cover
   ├─ TrackInfo shows metadata
   ├─ SeekBar shows progress
   ├─ VUMeters animate with audio levels
   └─ Waveform highlights current position
```

### Playlist Flow

```
1. Create playlist:
   ├─ User names playlist
   ├─ Frontend sends command to Rust
   └─ Rust creates entry in playlists table
2. Add tracks to playlist:
   ├─ User drags tracks or clicks "Add to playlist"
   ├─ Frontend sends track IDs + playlist ID to Rust
   └─ Rust inserts into playlist_tracks junction table
3. Load playlist:
   ├─ User selects playlist
   ├─ Frontend requests tracks from Rust
   ├─ Rust queries with JOIN
   └─ Frontend displays track list
4. Play playlist:
   ├─ Load all tracks into queue
   ├─ Start playing first track
   └─ Auto-advance to next on completion
5. Changes persist automatically:
   └─ All modifications write through to SQLite
```

### File Monitoring Flow

```
1. Rust file watcher (notify crate) monitors configured folder
2. Events detected:
   ├─ Create: New .mp3 file added
   ├─ Modify: Existing file updated (rare for audio)
   └─ Delete: File removed
3. On Create event:
   ├─ Rust emits event to frontend with file path
   ├─ Frontend parses ID3 tags
   ├─ Frontend sends metadata to Rust
   ├─ Rust adds to SQLite
   └─ Frontend refreshes library view
4. On Delete event:
   ├─ Rust removes from SQLite
   └─ Frontend updates library (removes from UI)
```

---

## 4. Error Handling

### File System Errors

**Folder not accessible:**
- Show error in settings UI
- Prompt user to select different folder
- Don't crash app

**File unreadable:**
- Skip file during scan
- Log warning to console
- Continue processing other files

**Invalid MP3:**
- Display in library with "Unknown" metadata
- Allow playback attempt (may fail gracefully)
- Show toast if playback fails

**Folder deleted while running:**
- Pause file watcher
- Show notification: "Monitored folder no longer accessible"
- Prompt user to select new folder in settings

### Cloud Integration Errors

**S3 Invalid Credentials:**
- Show error message in settings
- Clear saved credentials
- Prompt user to re-enter

**S3 Network Timeout:**
- Retry 3x with exponential backoff (1s, 2s, 4s)
- If all retries fail, show "Offline" badge on S3 tracks
- Allow retry button in UI

**Drive Auth Expired:**
- Detect 401 Unauthorized response
- Trigger re-auth flow automatically
- Show notification: "Please reconnect Google Drive"

**Drive Quota Exceeded:**
- Show notification with Google Drive quota info
- Disable Drive source temporarily
- Allow user to manage in settings

**File Not Found (cloud):**
- Remove from library
- Skip if in playlist queue
- Show notification: "Track no longer available"

### Playback Errors

**Corrupt/Unsupported File:**
- Show toast notification: "Unable to play [filename]"
- Skip to next track in queue
- Log error details to console

**Network Stream Interrupted:**
- Pause playback
- Show buffering indicator
- Auto-resume when connection restored
- Timeout after 30s, skip to next track

**Audio Device Unavailable:**
- Detect Web Audio API error
- Show notification: "No audio output device found"
- Pause playback
- Resume when device available

### Database Errors

**SQLite Write Failure:**
- Retry write once immediately
- If still fails, show error toast
- Log to console for debugging
- Continue with in-memory state

**Corrupt Database:**
- Detect on app startup (check integrity)
- Show dialog: "Database corrupt, rebuild library?"
- If yes, re-scan all files and cloud sources
- If no, exit gracefully

**Migration Failure:**
- Rollback to previous schema version
- Log error details
- Show error dialog with recovery options

### General UX Principles

1. **Toast Notifications**: For transient errors (network issues, file skips)
2. **Modal Dialogs**: For critical errors requiring user action (setup, auth)
3. **Graceful Degradation**: If cloud fails, local still works
4. **Retry Mechanisms**: Automatic retries with backoff for network operations
5. **Logging**: All errors logged to Tauri's logging system (console + file)

---

## 5. Testing Strategy

### Rust Backend Tests

**Unit Tests:**
- File watcher logic (detect create/delete events)
- ID3 metadata extraction
- Database CRUD operations
- S3 presigned URL generation
- Drive OAuth token refresh

**Integration Tests:**
- Tauri commands end-to-end (call from JS, verify Rust response)
- Cloud API integration (use mocked HTTP responses)
- File system operations with temp directories

**Tools:**
- `cargo test` for unit/integration tests
- `mockall` crate for mocking external dependencies
- `tempfile` crate for test file operations

**Coverage Goal:** 70%+ for critical paths

### Frontend Tests

**Component Tests:**
- React Testing Library for all UI components
- Test user interactions (clicks, drags, keyboard shortcuts)
- Test state updates and re-renders
- Test error states and edge cases

**Store Tests:**
- Test Zustand store logic independently
- Verify state transitions
- Test side effects (local storage, commands)

**Integration Tests:**
- User flows:
  - Play track → pause → skip → adjust volume
  - Create playlist → add tracks → save → reload app
  - Search library → filter by source → play result
  - Toggle mini/expanded mode

**Tools:**
- Vitest (test runner)
- React Testing Library (component testing)
- MSW (Mock Service Worker) for API mocking
- @testing-library/user-event (user interactions)

**Coverage Goal:** 60%+ for components, 80%+ for stores

### E2E Tests

**Critical Paths:**
1. **First-run experience:**
   - Open app → select folder → scan completes → play track
2. **Cloud integration:**
   - Configure S3 → load tracks → play S3 track
   - Connect Drive → authorize → load tracks → play Drive track
3. **Playlist management:**
   - Create playlist → add tracks → save → close app → reopen → verify playlist persists
4. **UI modes:**
   - Toggle mini/expanded → verify visualizations work
   - Adjust volume → verify VU meters respond

**Tools:**
- Playwright (browser automation)
- OR Tauri's built-in testing framework

**Run Frequency:**
- Before releases
- In CI/CD pipeline on main branch

### Manual Testing

**Audio Quality:**
- Verify playback quality (no crackling, pops)
- Test VU meters accuracy (match perceived volume)
- Test waveform accuracy (matches audio content)

**UI/UX:**
- Smooth animations (60fps target)
- Responsive controls (no lag)
- Branding looks good (cosmic aesthetic)
- Retro elements feel cohesive

**Performance:**
- Test with large libraries (1000+ tracks)
- Monitor memory usage over time
- Check startup time
- Verify CPU usage during playback + visualizations

**Cross-Platform:**
- Test on macOS (multiple versions: Sonoma, Ventura)
- Test on Windows (before release)

### Development Testing Workflow

1. Write unit tests for new features (TDD approach)
2. Test manually in dev mode (`npm run tauri dev`)
3. Run full test suite before commits (`npm test`)
4. E2E tests run in CI before merging to main
5. Manual QA before releases

---

## 6. Database Schema

### SQLite Tables

**tracks:**
```sql
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  year INTEGER,
  genre TEXT,
  duration INTEGER, -- seconds
  file_path TEXT, -- local path or cloud identifier
  source TEXT NOT NULL, -- 'local', 's3', 'drive'
  album_art_url TEXT, -- data URL or cloud URL
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_tracks_source ON tracks(source);
CREATE INDEX idx_tracks_artist ON tracks(artist);
CREATE INDEX idx_tracks_album ON tracks(album);
```

**playlists:**
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**playlist_tracks:**
```sql
CREATE TABLE playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  track_id INTEGER NOT NULL,
  position INTEGER NOT NULL, -- order in playlist
  created_at INTEGER NOT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
```

**settings:**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 7. Security Considerations

### Credential Storage

- **S3 credentials**: Stored encrypted in OS keychain (macOS Keychain, Windows Credential Manager)
- **Drive OAuth tokens**: Same encrypted keychain storage
- **Never stored in**: SQLite database, local files, frontend code

### Tauri Security

- **Allowlist**: Only explicitly allowed Tauri commands exposed to frontend
- **CSP**: Content Security Policy prevents XSS
- **No eval()**: Frontend never uses eval or dangerous patterns
- **File system**: Only monitored folder accessible, no arbitrary file access

### Network Security

- **HTTPS Only**: All cloud API calls use HTTPS
- **Presigned URLs**: Time-limited (1 hour expiry) for S3 access
- **OAuth**: Industry-standard OAuth 2.0 for Drive
- **No CORS issues**: All network requests proxied through Rust backend

---

## 8. Performance Optimizations

### Frontend

- **Virtualized Lists**: Only render visible tracks (react-window)
- **Lazy Loading**: Load album art on demand
- **Memoization**: React.memo for expensive components
- **Debouncing**: Search input debounced (300ms)
- **Web Workers**: Offload waveform generation to worker thread

### Backend

- **Database Indexing**: Indexes on frequently queried columns
- **Batch Operations**: Bulk inserts during initial scan
- **Async I/O**: Non-blocking file operations
- **Connection Pooling**: Reuse SQLite connections

### Audio

- **Preloading**: Preload next track in queue
- **Buffer Size**: Optimize Howler.js buffer for smooth playback
- **Visualizations**: Throttle VU meter updates to 60fps

---

## Next Steps

1. **Write Implementation Plan**: Use `writing-plans` skill to break down into tasks
2. **Set Up Project**: Initialize Tauri + React project
3. **Implement Core Features**: Start with local playback, then cloud, then playlists
4. **Design UI**: Create cosmic retro-futurism aesthetic
5. **Test & Polish**: Comprehensive testing, performance tuning
6. **Release**: Package for macOS, plan Windows port

---

**End of Design Document**
