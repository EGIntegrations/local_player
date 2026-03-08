import { useEffect, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { animate } from 'animejs';
import { MiniPlayer } from './player/MiniPlayer';
import { ExpandedPlayer } from './player/ExpandedPlayer';
import { Library } from './library/Library';
import { PlaylistManager } from './playlists/PlaylistManager';
import { Settings } from './settings/Settings';
import { Toast } from './common/Toast';
import { LoadingSpinner } from './common/LoadingSpinner';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { AudioService } from '../services/audioService';
import { parseID3Tags } from '../services/id3Parser';
import { scanFolder, startWatchingFolder, readFileHeader } from '../services/tauriCommands';
import * as db from '../services/database';

type ToastInfo = { message: string; type: 'success' | 'error' | 'info' };
type FileProcessingResult = {
  status: 'added' | 'existing' | 'failed';
  error?: string;
};
const THEME_MODE_KEY = 'theme_mode';
const EQ_STATE_KEY = 'equalizer_state';
const VISUALIZER_COLORS_KEY = 'visualizer_colors';

function isThemeMode(value: string | null): value is 'light' | 'dark' | 'system' {
  return value === 'light' || value === 'dark' || value === 'system';
}

function normalizeFileSystemPath(inputPath: string): string {
  if (!inputPath.startsWith('file://')) return inputPath;
  try {
    const url = new URL(inputPath);
    let normalized = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:/.test(normalized)) {
      normalized = normalized.slice(1);
    }
    return normalized || inputPath;
  } catch {
    return inputPath;
  }
}

function fallbackTitleFromPath(filePath: string): string {
  const normalized = normalizeFileSystemPath(filePath).replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? filePath;
  const title = fileName.replace(/\.mp3$/i, '').trim();
  return title || 'Unknown Track';
}

function parseFilenameMetadata(filePath: string): { title: string; artist: string | null } {
  const normalized = normalizeFileSystemPath(filePath).replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? filePath;
  const stem = fileName.replace(/\.mp3$/i, '').trim();
  if (!stem) return { title: 'Unknown Track', artist: null };

  const parts = stem.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const artist = parts[0] || null;
    const title = parts.slice(1).join(' - ').trim() || stem;
    return { title, artist };
  }

  return { title: stem, artist: null };
}

function chooseTitle(tagTitle: string | null | undefined, filePath: string): string {
  const normalized = tagTitle?.trim() ?? '';
  if (!normalized || /^unknown$/i.test(normalized)) {
    return parseFilenameMetadata(filePath).title;
  }
  return normalized;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(120, 120, 120, ${alpha})`;
  const int = Number.parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function PlayerShell() {
  const audioRef = useRef<AudioService | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const playbackBlobUrlRef = useRef<string | null>(null);
  const playbackRequestRef = useRef(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [stereoAnalysers, setStereoAnalysers] = useState<{ left: AnalyserNode | null; right: AnalyserNode | null }>({
    left: null,
    right: null,
  });
  const {
    currentTrack,
    progress,
    setPlaying,
    setProgress,
    setDuration,
    setVolume,
    advancePlayback,
  } = usePlayerStore();
  const { setTracks, addTrack: addTrackToLibrary } = useLibraryStore();
  const setMonitoredFolder = useSettingsStore((s) => s.setMonitoredFolder);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setResolvedTheme = useSettingsStore((s) => s.setResolvedTheme);
  const syncResolvedTheme = useSettingsStore((s) => s.syncResolvedTheme);
  const equalizer = useSettingsStore((s) => s.equalizer);
  const setEqState = useSettingsStore((s) => s.setEqState);
  const setEqBandGain = useSettingsStore((s) => s.setEqBandGain);
  const setEqPreamp = useSettingsStore((s) => s.setEqPreamp);
  const setEqOutput = useSettingsStore((s) => s.setEqOutput);
  const setEqBypass = useSettingsStore((s) => s.setEqBypass);
  const resetEq = useSettingsStore((s) => s.resetEq);
  const visualizerColors = useSettingsStore((s) => s.visualizerColors);
  const setVisualizerColors = useSettingsStore((s) => s.setVisualizerColors);
  const { activeView, setActiveView, setSettingsVisible, togglePlayerMode, playerMode } = useUIStore();
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const startPlayback = useCallback(
    async (showErrorToast = true): Promise<string | null> => {
      if (!audioRef.current) return 'Audio service unavailable';
      try {
        await audioRef.current.playWithConfirm();
        setPlaying(true);
        setAnalyserNode(audioRef.current.getAnalyser());
        setStereoAnalysers(audioRef.current.getStereoAnalysers());
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPlaying(false);
        if (showErrorToast) {
          setToast({ message: `Playback error: ${message}`, type: 'error' });
        }
        return message;
      }
    },
    [setPlaying],
  );

  // Initialize audio service
  useEffect(() => {
    const audio = new AudioService();
    audioRef.current = audio;
    const initialEq = useSettingsStore.getState().equalizer;
    for (let i = 0; i < initialEq.bands.length; i += 1) {
      audio.setEqBandGain(i, initialEq.bands[i]);
    }
    audio.setEqPreamp(initialEq.preampDb);
    audio.setEqOutput(initialEq.output);
    audio.setEqBypass(initialEq.bypass);

    audio.onProgress((p) => setProgress(p));
    audio.onEnd(() => {
      setPlaying(false);
      const nextTrack = advancePlayback(1);
      if (!nextTrack) {
        setPlaying(false);
      }
    });
    audio.onLoad((dur) => {
      setDuration(dur);
      setAnalyserNode(audio.getAnalyser());
      setStereoAnalysers(audio.getStereoAnalysers());
    });
    audio.onError((message) => {
      console.error('Audio playback error:', message);
    });
    audio.onDebug((message) => {
      console.debug(`[AudioService] ${message}`);
    });

    return () => audio.cleanup();
  }, [advancePlayback, setDuration, setPlaying, setProgress]);

  useEffect(() => {
    if (!audioRef.current) return;
    for (let i = 0; i < equalizer.bands.length; i += 1) {
      audioRef.current.setEqBandGain(i, equalizer.bands[i]);
    }
    audioRef.current.setEqPreamp(equalizer.preampDb);
    audioRef.current.setEqOutput(equalizer.output);
    audioRef.current.setEqBypass(equalizer.bypass);
  }, [equalizer]);

  useEffect(() => {
    return () => {
      if (playbackBlobUrlRef.current) {
        URL.revokeObjectURL(playbackBlobUrlRef.current);
        playbackBlobUrlRef.current = null;
      }
    };
  }, []);

  // Load track when currentTrack changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    let cancelled = false;
    const loadTrack = async () => {
      const normalizedPath = normalizeFileSystemPath(currentTrack.filePath);
      const requestId = ++playbackRequestRef.current;
      const loadErrors: string[] = [];
      let bytes: Uint8Array | null = null;
      setProgress(0);
      setDuration(0);
      try {
        bytes = await readFile(normalizedPath);
      } catch (error) {
        const readError = error instanceof Error ? error.message : String(error);
        loadErrors.push(`fs-read failed (${readError})`);
      }

      const sources: { kind: 'blob' | 'asset' | 'data'; url: string }[] = [];
      if (bytes && bytes.length > 0) {
        if (playbackBlobUrlRef.current) {
          URL.revokeObjectURL(playbackBlobUrlRef.current);
          playbackBlobUrlRef.current = null;
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        playbackBlobUrlRef.current = URL.createObjectURL(audioBlob);
        sources.push({ kind: 'blob', url: playbackBlobUrlRef.current });
      }
      sources.push({ kind: 'asset', url: convertFileSrc(normalizedPath) });
      if (bytes && bytes.length > 0) {
        sources.push({ kind: 'data', url: `data:audio/mpeg;base64,${bytesToBase64(bytes)}` });
      }

      for (const source of sources) {
        if (cancelled || !audioRef.current || requestId !== playbackRequestRef.current) return;
        try {
          await audioRef.current.loadTrack(source.url);
          if (cancelled || !audioRef.current || requestId !== playbackRequestRef.current) return;
          const playbackError = await startPlayback(false);
          if (playbackError) {
            loadErrors.push(`${source.kind} play failed (${playbackError})`);
            continue;
          }
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          loadErrors.push(`${source.kind} failed (${message})`);
        }
      }

      if (cancelled || requestId !== playbackRequestRef.current) return;
      setPlaying(false);
      setToast({ message: `Playback error: ${loadErrors.join(' | ')}`, type: 'error' });
    };

    loadTrack().catch((err) => {
      console.error('Error loading track:', err);
      setToast({ message: `Playback setup error: ${String(err)}`, type: 'error' });
      setPlaying(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack, setDuration, setPlaying, setProgress, startPlayback]);

  // Load library on startup
  useEffect(() => {
    const loadLibrary = async () => {
      const existingTracks = await db.getAllTracks();
      // Backfill legacy imports that were stored as "Unknown" before filename fallback.
      for (const track of existingTracks) {
        const unknownTitle = !track.title || /^unknown$/i.test(track.title.trim());
        const unknownArtist = !track.artist || /^unknown artist$/i.test(track.artist.trim());
        if (!unknownTitle && !unknownArtist) continue;

        const fallback = parseFilenameMetadata(track.filePath);
        const nextTitle = unknownTitle ? fallback.title : track.title;
        const nextArtist = unknownArtist ? fallback.artist : track.artist;
        await db.updateTrackMetadata(track.id, {
          title: nextTitle || fallbackTitleFromPath(track.filePath),
          artist: nextArtist ?? null,
        });
      }

      const refreshed = await db.getAllTracks();
      setTracks(refreshed);
    };

    loadLibrary().catch(console.error);
  }, [setTracks]);

  // Load saved folder setting
  useEffect(() => {
    db.getSetting('monitored_folder').then((folder) => {
      if (folder) {
        setMonitoredFolder(folder);
        startWatchingFolder(folder).catch(console.error);
      }
    }).catch(console.error);
  }, [setMonitoredFolder]);

  useEffect(() => {
    let cancelled = false;
    const loadUiSettings = async () => {
      const [storedThemeMode, storedEq, storedColors] = await Promise.all([
        db.getSetting(THEME_MODE_KEY),
        db.getSetting(EQ_STATE_KEY),
        db.getSetting(VISUALIZER_COLORS_KEY),
      ]);

      if (!cancelled && isThemeMode(storedThemeMode)) {
        setThemeMode(storedThemeMode);
      }

      if (!cancelled && storedEq) {
        try {
          const parsed = JSON.parse(storedEq);
          if (parsed && typeof parsed === 'object') {
            setEqState(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse saved equalizer state:', err);
        }
      }

      if (!cancelled && storedColors) {
        try {
          const parsed = JSON.parse(storedColors);
          if (parsed && typeof parsed === 'object') {
            setVisualizerColors(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse saved visualizer colors:', err);
        }
      }
    };

    loadUiSettings().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [setEqState, setThemeMode, setVisualizerColors]);

  useEffect(() => {
    db.setSetting(THEME_MODE_KEY, themeMode).catch(console.error);
  }, [themeMode]);

  useEffect(() => {
    db.setSetting(EQ_STATE_KEY, JSON.stringify(equalizer)).catch(console.error);
  }, [equalizer]);

  useEffect(() => {
    db.setSetting(VISUALIZER_COLORS_KEY, JSON.stringify(visualizerColors)).catch(console.error);
  }, [visualizerColors]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setResolvedTheme(themeMode === 'dark' ? 'dark' : 'light');
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMode === 'system') {
      syncResolvedTheme(media.matches);
      const onChange = (event: MediaQueryListEvent) => syncResolvedTheme(event.matches);
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
      }
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
    setResolvedTheme(themeMode);
  }, [setResolvedTheme, syncResolvedTheme, themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--viz-waveform', visualizerColors.waveform);
    root.style.setProperty('--viz-vu', visualizerColors.vu);
    root.style.setProperty('--viz-grid', hexToRgba(visualizerColors.waveform, 0.28));
  }, [visualizerColors]);

  // Listen for file watcher events
  useEffect(() => {
    const unlisten = listen<string>('file-created', async (event) => {
      await processNewFile(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const processNewFile = useCallback(async (filePath: string): Promise<FileProcessingResult> => {
    try {
      const normalizedPath = normalizeFileSystemPath(filePath);

      // Check if already in library
      const existing = await db.getTrackByFilePath(normalizedPath);
      if (existing) return { status: 'existing' };

      let tags: Awaited<ReturnType<typeof parseID3Tags>> | null = null;
      try {
        const bytes = await readFileHeader(normalizedPath);
        const buffer = new Uint8Array(bytes).buffer;
        tags = await parseID3Tags(buffer);
      } catch (headerErr) {
        console.warn('ID3 parse failed; importing with fallback metadata:', normalizedPath, headerErr);
      }

      const title = chooseTitle(tags?.title, normalizedPath);
      const fallback = parseFilenameMetadata(normalizedPath);
      const normalizedArtist = tags?.artist?.trim();
      const artist = normalizedArtist && !/^unknown artist$/i.test(normalizedArtist)
        ? normalizedArtist
        : fallback.artist;
      const safeYear = Number.isFinite(tags?.year) ? tags?.year ?? null : null;

      const id = await db.addTrack({
        title,
        artist,
        album: tags?.album ?? null,
        year: safeYear,
        genre: tags?.genre ?? null,
        duration: null,
        filePath: normalizedPath,
        source: 'local',
        albumArtUrl: tags?.albumArt ?? null,
      });

      addTrackToLibrary({
        id,
        title,
        artist,
        album: tags?.album ?? null,
        year: safeYear,
        genre: tags?.genre ?? null,
        duration: 0,
        filePath: normalizedPath,
        source: 'local',
        albumArtUrl: tags?.albumArt ?? null,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
      return { status: 'added' };
    } catch (err) {
      console.error('Error processing file:', filePath, err);
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failed', error: message };
    }
  }, [addTrackToLibrary]);

  const importFilesIntoLibrary = useCallback(async (files: string[]) => {
    let added = 0;
    let existing = 0;
    let failed = 0;
    let firstError: string | null = null;

    for (const filePath of files.map(normalizeFileSystemPath)) {
      const result = await processNewFile(filePath);
      if (result.status === 'added') added += 1;
      if (result.status === 'existing') existing += 1;
      if (result.status === 'failed') {
        failed += 1;
        if (!firstError && result.error) firstError = result.error;
      }
    }

    const tracks = await db.getAllTracks();
    setTracks(tracks);

    return { added, existing, failed, total: files.length, libraryCount: tracks.length, firstError };
  }, [processNewFile, setTracks]);

  const handleFolderSelected = async (folderPath: string) => {
    const normalizedFolder = normalizeFileSystemPath(folderPath);
    setMonitoredFolder(normalizedFolder);
    setSettingsVisible(false);
    await db.setSetting('monitored_folder', normalizedFolder);
    setIsScanning(true);
    setActiveView('library');

    try {
      const files = await scanFolder(normalizedFolder);
      setToast({ message: `Found ${files.length} MP3 files. Scanning...`, type: 'info' });

      const summary = await importFilesIntoLibrary(files);

      await startWatchingFolder(normalizedFolder);
      const summaryText = summary.failed > 0
        ? `Library loaded: ${summary.libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.failed} failed${summary.firstError ? `: ${summary.firstError}` : ''})`
        : `Library loaded: ${summary.libraryCount} tracks (${summary.added} added, ${summary.existing} existing)`;
      setToast({ message: summaryText, type: 'success' });
    } catch (err) {
      setToast({ message: `Error scanning folder: ${err}`, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilesSelected = async (paths: string[]) => {
    setSettingsVisible(false);
    setIsScanning(true);
    setActiveView('library');

    try {
      const mp3Files = paths
        .map(normalizeFileSystemPath)
        .filter((path) => /\.mp3$/i.test(path));
      if (mp3Files.length === 0) {
        setToast({ message: 'No .mp3 files selected', type: 'error' });
        return;
      }

      setToast({ message: `Adding ${mp3Files.length} selected files...`, type: 'info' });
      const summary = await importFilesIntoLibrary(mp3Files);
      const summaryText = summary.failed > 0
        ? `Library loaded: ${summary.libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.failed} failed${summary.firstError ? `: ${summary.firstError}` : ''})`
        : `Library loaded: ${summary.libraryCount} tracks (${summary.added} added, ${summary.existing} existing)`;
      setToast({ message: summaryText, type: 'success' });
    } catch (err) {
      setToast({ message: `Error adding files: ${err}`, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handlePlay = () => {
    void startPlayback();
  };
  const handlePause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };
  const handleNext = () => {
    const nextTrack = advancePlayback(1);
    if (!nextTrack) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  };
  const handlePrevious = () => {
    const liveProgress = audioRef.current?.getSeek() ?? progress;
    if (liveProgress > 3) {
      audioRef.current?.seek(0);
      setProgress(0);
      void startPlayback();
      return;
    }
    const previousTrack = advancePlayback(-1);
    if (!previousTrack) {
      audioRef.current?.seek(0);
      setProgress(0);
      void startPlayback();
    }
  };
  const handleSeek = (pos: number) => {
    audioRef.current?.seek(pos);
    setProgress(pos);
  };
  const handleVolumeChange = (vol: number) => {
    audioRef.current?.setVolume(vol);
    setVolume(vol);
  };
  const handleEqBandChange = useCallback((index: number, gainDb: number) => {
    setEqBandGain(index, gainDb);
  }, [setEqBandGain]);
  const handleEqPreampChange = useCallback((gainDb: number) => {
    setEqPreamp(gainDb);
  }, [setEqPreamp]);
  const handleEqOutputChange = useCallback((output: number) => {
    setEqOutput(output);
  }, [setEqOutput]);
  const handleEqBypassToggle = useCallback((enabled: boolean) => {
    setEqBypass(enabled);
  }, [setEqBypass]);
  const handleEqReset = useCallback(() => {
    resetEq();
  }, [resetEq]);

  useEffect(() => {
    if (!shellRef.current) return;
    const surfaces = shellRef.current.querySelectorAll<HTMLElement>('.js-surface');
    if (surfaces.length === 0) return;
    const animation = animate(surfaces, {
      opacity: [0, 1],
      translateY: [18, 0],
      scale: [0.992, 1],
      delay: (_el, i) => i * 75,
      duration: 620,
      ease: 'out(4)',
    });
    return () => {
      animation.pause();
    };
  }, []);

  useEffect(() => {
    if (!shellRef.current) return;
    const activePanel = shellRef.current.querySelector('.js-active-panel');
    if (!activePanel) return;
    const animation = animate(activePanel, {
      opacity: [0.5, 1],
      scale: [0.988, 1],
      translateY: [8, 0],
      duration: 460,
      ease: 'out(4)',
    });
    return () => {
      animation.pause();
    };
  }, [activeView, playerMode, currentTrack?.id]);

  return (
    <div className="app-shell screen-flicker" ref={shellRef}>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="js-surface mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="brand-title mt-2 text-4xl text-cosmic-light-teal">
              Local Player
            </h1>
          </div>

          <div className="flex gap-2">
            <div className="theme-chip" aria-label="Theme mode">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`theme-chip-btn ${themeMode === mode ? 'theme-chip-btn-active' : ''}`}
                  title={`Use ${mode} theme`}
                >
                  {mode === 'system' ? 'Sys' : mode[0].toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setActiveView('player');
                togglePlayerMode();
              }}
              className="terminal-btn px-4 py-2"
            >
              {playerMode === 'mini' ? 'Expand' : 'Minimize'}
            </button>
            <button
              onClick={() => setSettingsVisible(true)}
              className="terminal-btn px-4 py-2"
            >
              Settings
            </button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="js-surface mb-8 flex gap-2">
          {(['player', 'library', 'playlists'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`terminal-tab px-4 py-2 transition-colors ${
                activeView === view
                  ? 'terminal-tab-active'
                  : ''
              }`}
            >
              {view}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="js-surface mx-auto max-w-5xl">
          {isScanning && <LoadingSpinner />}

          {activeView === 'player' && (
            <div className={`js-active-panel panel mx-auto transition-all ${playerMode === 'mini' ? 'max-w-2xl' : 'max-w-5xl'}`}>
              {playerMode === 'mini' ? (
                <MiniPlayer
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                />
              ) : (
                <ExpandedPlayer
                  analyser={analyserNode}
                  leftAnalyser={stereoAnalysers.left}
                  rightAnalyser={stereoAnalysers.right}
                  equalizer={equalizer}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                  onEqBandChange={handleEqBandChange}
                  onEqPreampChange={handleEqPreampChange}
                  onEqOutputChange={handleEqOutputChange}
                  onEqBypassChange={handleEqBypassToggle}
                  onEqReset={handleEqReset}
                />
              )}
            </div>
          )}

          {activeView === 'library' && <div className="js-active-panel"><Library /></div>}
          {activeView === 'playlists' && <div className="js-active-panel"><PlaylistManager /></div>}
        </main>
      </div>

      <Settings onFolderSelected={handleFolderSelected} onFilesSelected={handleFilesSelected} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
