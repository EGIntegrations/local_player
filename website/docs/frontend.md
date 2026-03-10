---
title: Frontend
---

## Frontend Stack

- React 19 (`src/main.tsx`, `src/App.tsx`)
- TypeScript strict mode
- Zustand state stores
- Howler.js for playback
- Web Audio API for EQ + visualization analysis
- Tailwind CSS v4 plus custom CSS variables/styles

## Component Architecture

Primary shell:

- `PlayerShell.tsx`: lifecycle + orchestration

UI domains:

- `components/player/*`: mini and expanded player controls
- `components/library/*`: filter/search/list for tracks
- `components/playlists/*`: playlist CRUD and membership management
- `components/settings/*`: modal, folder and file selection
- `components/visualizations/*`: waveform and stereo VU views
- `components/common/*`: loading and toast primitives

## Store Responsibilities

### `libraryStore`

- Holds `tracks`, `filteredTracks`, `sourceFilter`, `searchQuery`
- Performs source/query filtering in-store

### `playerStore`

- Holds `currentTrack`, play state, progress, duration, volume
- Tracks playback context with `playbackOrder` + `playbackIndex`
- Provides boundary-safe `advancePlayback(1 | -1)` behavior

### `settingsStore`

- Persists `themeMode`, `resolvedTheme`, EQ state, visualizer colors
- Clamps EQ values to expected safe ranges
- Supports theme resolution for `system` mode

## Audio Service Behavior

`src/services/audioService.ts` provides:

- Track load lifecycle with fallback/error callbacks
- `playWithConfirm()` start confirmation with timeout handling
- Progress callbacks via interval polling
- Dynamic analyser graph connection per current media element
- 10-band EQ controls (`setEqBandGain`, `setEqPreamp`, `setEqOutput`, `setEqBypass`, `resetEq`)

## Metadata Parsing

`src/services/id3Parser.ts`:

- Parses ID3v2 frames from header bytes
- Supports title/artist/album/year/genre/APIC album art extraction
- Produces normalized `ID3Tags` object for import pipeline

## Frontend Testing Coverage

Implemented tests include:

- Store tests (`tests/stores/*`)
- Audio service behavior tests (`tests/services/audioService.test.ts`)
- Integration tests for track selection and expanded EQ controls (`tests/components/*`)
