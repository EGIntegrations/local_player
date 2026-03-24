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
import { scanFolder, startWatchingFolder, readFileHeader, readFileBytes, pathExists } from '../services/tauriCommands';
import * as db from '../services/database';

type ToastInfo = { message: string; type: 'success' | 'error' | 'info' };
type FileProcessingResult = {
  status: 'added' | 'existing' | 'skipped' | 'failed';
  error?: string;
};
type WindowBounds = { width: number; height: number; x: number; y: number };
const THEME_MODE_KEY = 'theme_mode';
const EQ_STATE_KEY = 'equalizer_state';
const VISUALIZER_COLORS_KEY = 'visualizer_colors';
const ACTIVE_LIBRARY_SCOPE_KEY = 'active_library_scope_id';
const MANUAL_LIBRARY_SCOPE_ID = 'manual:imports';

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

function getBasename(filePath: string): string {
  const normalized = normalizeFileSystemPath(filePath).replace(/\\/g, '/');
  return normalized.split('/').pop() ?? normalized;
}

function normalizeLookupValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[\s._-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

function trackLookupKeyFromPath(filePath: string): string {
  const baseName = getBasename(filePath).replace(/\.mp3$/i, '');
  return normalizeLookupValue(baseName);
}

function toFilePathKey(filePath: string): string {
  return normalizeFileSystemPath(filePath).replace(/\\/g, '/').trim().toLowerCase();
}

function scopeIdFromFolderPath(folderPath: string): string {
  return `folder:${toFilePathKey(folderPath)}`;
}

function isWindowBounds(value: unknown): value is WindowBounds {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<WindowBounds>;
  return (
    Number.isFinite(maybe.width) &&
    Number.isFinite(maybe.height) &&
    Number.isFinite(maybe.x) &&
    Number.isFinite(maybe.y)
  );
}

function isImportableMp3Path(filePath: string): boolean {
  const baseName = getBasename(filePath).trim();
  if (!baseName) return false;
  if (baseName.startsWith('._') || baseName.startsWith('.')) return false;
  return /\.mp3$/i.test(baseName);
}

function isPathInsideFolder(filePath: string, folderPath: string): boolean {
  const normalizedFile = normalizeFileSystemPath(filePath).replace(/\\/g, '/');
  const normalizedFolder = normalizeFileSystemPath(folderPath).replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalizedFolder) return false;
  return normalizedFile === normalizedFolder || normalizedFile.startsWith(`${normalizedFolder}/`);
}

function isMissingFileError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('no such file or directory') || lower.includes('os error 2');
}

function chooseTitle(tagTitle: string | null | undefined, filePath: string): string {
  const normalized = tagTitle?.trim() ?? '';
  if (!normalized || /^unknown$/i.test(normalized)) {
    return parseFilenameMetadata(filePath).title;
  }
  return normalized;
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
    isPlaying,
    progress,
    setCurrentTrack,
    setPlaying,
    setProgress,
    setDuration,
    setVolume,
    advancePlayback,
  } = usePlayerStore();
  const { setTracks } = useLibraryStore();
  const setMonitoredFolder = useSettingsStore((s) => s.setMonitoredFolder);
  const activeLibraryScopeId = useSettingsStore((s) => s.activeLibraryScopeId);
  const setActiveLibraryScopeId = useSettingsStore((s) => s.setActiveLibraryScopeId);
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
  const { activeView, setActiveView, setSettingsVisible, togglePlayerMode, playerMode, setPlayerMode } = useUIStore();
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaningLibrary, setIsCleaningLibrary] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);
  const [windowMinimized, setWindowMinimized] = useState(false);
  const visualizerActive = isPlaying && activeView === 'player' && windowFocused && !windowMinimized;
  const normalWindowBoundsRef = useRef<WindowBounds | null>(null);
  const inFlightImportsRef = useRef<Set<string>>(new Set());

  const revokePlaybackBlobUrl = useCallback(() => {
    if (!playbackBlobUrlRef.current) return;
    URL.revokeObjectURL(playbackBlobUrlRef.current);
    playbackBlobUrlRef.current = null;
    audioRef.current?.setActiveBlobCount(0);
  }, []);

  const refreshVisibleLibrary = useCallback(async (scopeId?: string | null): Promise<number> => {
    const effectiveScope = scopeId ?? useSettingsStore.getState().activeLibraryScopeId;
    const tracks = effectiveScope ? await db.getTracksByScope(effectiveScope) : [];
    setTracks(tracks);
    return tracks.length;
  }, [setTracks]);

  const cleanupLibraryRecords = useCallback(async (): Promise<{
    libraryCount: number;
    removedInvalid: number;
    removedMissing: number;
    deduped: number;
    relocated: number;
    repairedMetadata: number;
  }> => {
    let removedInvalid = 0;
    let removedMissing = 0;
    let deduped = 0;
    let relocated = 0;
    let repairedMetadata = 0;
    const cleanedTrackIds = new Set<number>();

    const existingTracks = await db.getAllTracks();
    for (const track of existingTracks) {
      if (isImportableMp3Path(track.filePath)) continue;
      await db.deleteTrack(track.id);
      cleanedTrackIds.add(track.id);
      removedInvalid += 1;
    }

    const monitoredFolder = normalizeFileSystemPath((await db.getSetting('monitored_folder')) ?? '');
    const monitoredFolderAvailable = monitoredFolder ? await pathExists(monitoredFolder).catch(() => false) : false;
    let monitoredFiles: string[] = [];
    if (monitoredFolder && monitoredFolderAvailable) {
      try {
        monitoredFiles = (await scanFolder(monitoredFolder))
          .map(normalizeFileSystemPath)
          .filter(isImportableMp3Path);
      } catch (error) {
        console.warn('Unable to scan monitored folder during cleanup:', error);
      }
    }

    if (monitoredFiles.length > 0) {
      const monitoredSet = new Set(monitoredFiles);
      const monitoredByLookup = new Map<string, string[]>();
      for (const file of monitoredFiles) {
        const key = trackLookupKeyFromPath(file);
        if (!key) continue;
        const list = monitoredByLookup.get(key) ?? [];
        list.push(file);
        monitoredByLookup.set(key, list);
      }

      const tracksToRepair = (await db.getAllTracks()).filter((track) => !cleanedTrackIds.has(track.id));
      const usedTargetPaths = new Set(
        tracksToRepair
          .map((track) => normalizeFileSystemPath(track.filePath))
          .filter((path) => monitoredSet.has(path))
      );

      for (const track of tracksToRepair) {
        const currentPath = normalizeFileSystemPath(track.filePath);
        if (monitoredSet.has(currentPath)) continue;

        const key = trackLookupKeyFromPath(currentPath);
        const candidates = (monitoredByLookup.get(key) ?? []).filter((candidate) => !usedTargetPaths.has(candidate));
        if (candidates.length === 0) continue;

        const fallback = parseFilenameMetadata(currentPath);
        const targetArtist = (track.artist ?? fallback.artist ?? '').trim().toLowerCase();
        const targetTitle = (track.title || fallback.title || '').trim().toLowerCase();

        const bestMatch = candidates.find((candidate) => {
          const parsed = parseFilenameMetadata(candidate);
          const parsedArtist = (parsed.artist ?? '').trim().toLowerCase();
          const parsedTitle = (parsed.title ?? '').trim().toLowerCase();
          const artistMatches = !targetArtist || !parsedArtist || parsedArtist === targetArtist;
          const titleMatches = !targetTitle || parsedTitle === targetTitle;
          return artistMatches && titleMatches;
        }) ?? candidates[0];

        const existingAtTarget = tracksToRepair.find((other) => {
          if (other.id === track.id || cleanedTrackIds.has(other.id)) return false;
          return normalizeFileSystemPath(other.filePath) === bestMatch;
        });

        if (existingAtTarget) {
          await db.deleteTrack(track.id);
          cleanedTrackIds.add(track.id);
          deduped += 1;
        } else {
          await db.updateTrackFilePath(track.id, bestMatch);
          usedTargetPaths.add(bestMatch);
          relocated += 1;
        }
      }
    }

    // Prune stale DB entries whose files no longer exist.
    // If the monitored folder is temporarily offline (external drive), preserve paths under it.
    const existenceTracks = await db.getAllTracks();
    for (const track of existenceTracks) {
      if (cleanedTrackIds.has(track.id)) continue;
      const normalizedPath = normalizeFileSystemPath(track.filePath);
      const exists = await pathExists(normalizedPath).catch(() => false);
      if (exists) continue;

      const preserveForUnmountedMonitoredFolder =
        monitoredFolder &&
        !monitoredFolderAvailable &&
        isPathInsideFolder(normalizedPath, monitoredFolder);
      if (preserveForUnmountedMonitoredFolder) continue;

      await db.deleteTrack(track.id);
      cleanedTrackIds.add(track.id);
      removedMissing += 1;

      const activeTrackId = usePlayerStore.getState().currentTrack?.id;
      if (activeTrackId === track.id) {
        audioRef.current?.stop();
        setPlaying(false);
        setCurrentTrack(null);
      }
    }

    const postRepairTracks = await db.getAllTracks();
    const buckets = new Map<string, typeof postRepairTracks>();
    for (const track of postRepairTracks) {
      if (cleanedTrackIds.has(track.id)) continue;
      const normalizedPath = normalizeFileSystemPath(track.filePath);
      const bucket = buckets.get(normalizedPath) ?? [];
      bucket.push(track);
      buckets.set(normalizedPath, bucket);
    }

    for (const [, bucket] of buckets) {
      if (bucket.length <= 1) continue;
      const sorted = [...bucket].sort((a, b) => {
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
        return b.id - a.id;
      });
      for (let i = 1; i < sorted.length; i += 1) {
        await db.deleteTrack(sorted[i].id);
        cleanedTrackIds.add(sorted[i].id);
        deduped += 1;
      }
    }

    const finalTracks = await db.getAllTracks();
    for (const track of finalTracks) {
      if (cleanedTrackIds.has(track.id)) continue;
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
      repairedMetadata += 1;
    }

    const libraryCount = await refreshVisibleLibrary();
    return {
      libraryCount,
      removedInvalid,
      removedMissing,
      deduped,
      relocated,
      repairedMetadata,
    };
  }, [refreshVisibleLibrary, setCurrentTrack, setPlaying]);

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
      revokePlaybackBlobUrl();
    };
  }, [revokePlaybackBlobUrl]);

  // Load track when currentTrack changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    let cancelled = false;
    const loadTrack = async () => {
      const normalizedPath = normalizeFileSystemPath(currentTrack.filePath);
      const requestId = ++playbackRequestRef.current;
      const loadErrors: string[] = [];
      let playbackPath = normalizedPath;
      setProgress(0);
      setDuration(0);
      revokePlaybackBlobUrl();

      const readAudioBytes = async (filePath: string): Promise<Uint8Array> => {
        try {
          return await readFile(filePath);
        } catch (fsError) {
          const fsMessage = fsError instanceof Error ? fsError.message : String(fsError);
          if (isMissingFileError(fsMessage)) {
            throw new Error(fsMessage);
          }

          try {
            const fallbackBytes = await readFileBytes(filePath);
            return new Uint8Array(fallbackBytes);
          } catch (fallbackError) {
            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            throw new Error(`${fsMessage}; command read failed (${fallbackMessage})`);
          }
        }
      };

      const resolveMovedTrackPath = async (): Promise<string | null> => {
        const monitoredFolder = normalizeFileSystemPath((await db.getSetting('monitored_folder')) ?? '');
        if (!monitoredFolder) return null;
        const monitoredFolderAvailable = await pathExists(monitoredFolder).catch(() => false);
        if (!monitoredFolderAvailable) return null;

        const monitoredFiles = (await scanFolder(monitoredFolder))
          .map(normalizeFileSystemPath)
          .filter(isImportableMp3Path);
        if (monitoredFiles.length === 0) return null;

        const targetName = normalizeLookupValue(getBasename(playbackPath));
        const exactNameMatches = monitoredFiles
          .filter((file) => normalizeLookupValue(getBasename(file)) === targetName);

        if (exactNameMatches.length === 1) {
          return exactNameMatches[0];
        }

        if (exactNameMatches.length > 1) {
          const artist = currentTrack.artist?.trim().toLowerCase() ?? '';
          const title = currentTrack.title.trim().toLowerCase();
          const metadataMatch = exactNameMatches.find((file) => {
            const parsed = parseFilenameMetadata(file);
            const parsedArtist = parsed.artist?.trim().toLowerCase() ?? '';
            const parsedTitle = parsed.title.trim().toLowerCase();
            return parsedTitle === title && (!artist || parsedArtist === artist);
          });
          return metadataMatch ?? exactNameMatches[0];
        }

        const title = currentTrack.title.trim().toLowerCase();
        if (!title || title === 'unknown track') return null;

        const artist = currentTrack.artist?.trim().toLowerCase() ?? '';
        const fuzzyMatch = monitoredFiles
          .find((file) => {
            const parsed = parseFilenameMetadata(file);
            const parsedTitle = parsed.title.trim().toLowerCase();
            const parsedArtist = parsed.artist?.trim().toLowerCase() ?? '';
            return parsedTitle === title && (!artist || parsedArtist === artist);
          });

        return fuzzyMatch ?? null;
      };

      try {
        const pathExistsNow = await pathExists(playbackPath).catch(() => false);
        if (!pathExistsNow) {
          const relocatedPath = await resolveMovedTrackPath();
          if (relocatedPath) {
            playbackPath = relocatedPath;
            await db.updateTrackFilePath(currentTrack.id, relocatedPath);
            setCurrentTrack({ ...currentTrack, filePath: relocatedPath });
            await refreshVisibleLibrary();
          } else {
            await db.deleteTrack(currentTrack.id);
            await refreshVisibleLibrary();
            audioRef.current?.stop();
            setPlaying(false);
            setCurrentTrack(null);
            loadErrors.push(`fs-read failed (missing path: ${playbackPath})`);
            setToast({ message: `Playback error: ${loadErrors.join(' | ')}`, type: 'error' });
            return;
          }
        }
      } catch (resolveError) {
        const message = resolveError instanceof Error ? resolveError.message : String(resolveError);
        loadErrors.push(`path resolve failed (${message})`);
      }

      const tryLoadSource = async (
        source: { kind: 'asset' | 'blob'; url: string }
      ): Promise<{ ok: true } | { ok: false; error: string }> => {
        if (cancelled || !audioRef.current || requestId !== playbackRequestRef.current) {
          return { ok: false, error: 'stale request' };
        }
        try {
          await audioRef.current.loadTrack(source.url, source.kind);
          if (cancelled || !audioRef.current || requestId !== playbackRequestRef.current) {
            return { ok: false, error: 'stale request' };
          }
          const playbackError = await startPlayback(false);
          if (playbackError) {
            return { ok: false, error: `${source.kind} play failed (${playbackError})` };
          }
          return { ok: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { ok: false, error: `${source.kind} failed (${message})` };
        }
      };

      const assetResult = await tryLoadSource({ kind: 'asset', url: convertFileSrc(playbackPath) });
      if (assetResult.ok) return;
      if (assetResult.error !== 'stale request') {
        loadErrors.push(assetResult.error);
      }

      if (cancelled || requestId !== playbackRequestRef.current) return;

      try {
        const bytes = await readAudioBytes(playbackPath);
        if (cancelled || requestId !== playbackRequestRef.current) return;
        revokePlaybackBlobUrl();
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        playbackBlobUrlRef.current = URL.createObjectURL(audioBlob);
        audioRef.current?.setActiveBlobCount(1);

        const blobResult = await tryLoadSource({ kind: 'blob', url: playbackBlobUrlRef.current });
        if (blobResult.ok) return;
        if (blobResult.error !== 'stale request') {
          loadErrors.push(blobResult.error);
        }
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        loadErrors.push(`blob fallback failed (${fallbackMessage})`);
      }

      if (cancelled || requestId !== playbackRequestRef.current) return;
      setPlaying(false);
      revokePlaybackBlobUrl();
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
  }, [
    currentTrack,
    refreshVisibleLibrary,
    revokePlaybackBlobUrl,
    setCurrentTrack,
    setDuration,
    setPlaying,
    setProgress,
    startPlayback,
  ]);

  // Load library on startup
  useEffect(() => {
    const loadLibrary = async () => {
      await cleanupLibraryRecords();
    };

    loadLibrary().catch(console.error);
  }, [cleanupLibraryRecords]);

  const handleCleanDuplicates = useCallback(async () => {
    setIsCleaningLibrary(true);
    setIsScanning(true);
    try {
      const summary = await cleanupLibraryRecords();
      setToast({
        type: 'success',
        message: `Library cleaned: ${summary.libraryCount} tracks (${summary.deduped} duplicates removed, ${summary.removedInvalid} invalid removed, ${summary.removedMissing} missing removed, ${summary.relocated} paths repaired, ${summary.repairedMetadata} metadata fixed)`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setToast({ type: 'error', message: `Cleanup failed: ${message}` });
    } finally {
      setIsCleaningLibrary(false);
      setIsScanning(false);
    }
  }, [cleanupLibraryRecords]);

  // Load saved folder setting
  useEffect(() => {
    let cancelled = false;
    const loadMonitoredFolder = async () => {
      const folder = await db.getSetting('monitored_folder');
      if (cancelled || !folder) return;
      const normalizedFolder = normalizeFileSystemPath(folder);
      setMonitoredFolder(normalizedFolder);
      await startWatchingFolder(normalizedFolder).catch(console.error);
    };

    loadMonitoredFolder().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [setMonitoredFolder]);

  useEffect(() => {
    let cancelled = false;
    const loadUiSettings = async () => {
      const [storedThemeMode, storedEq, storedColors, storedScopeId, storedMonitoredFolder] = await Promise.all([
        db.getSetting(THEME_MODE_KEY),
        db.getSetting(EQ_STATE_KEY),
        db.getSetting(VISUALIZER_COLORS_KEY),
        db.getSetting(ACTIVE_LIBRARY_SCOPE_KEY),
        db.getSetting('monitored_folder'),
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

      if (!cancelled) {
        const normalizedMonitoredFolder = storedMonitoredFolder
          ? normalizeFileSystemPath(storedMonitoredFolder)
          : '';
        const fallbackScope = normalizedMonitoredFolder
          ? scopeIdFromFolderPath(normalizedMonitoredFolder)
          : null;
        const resolvedScope = storedScopeId && storedScopeId.trim() ? storedScopeId : fallbackScope;
        setActiveLibraryScopeId(resolvedScope);
      }
    };

    loadUiSettings().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [setActiveLibraryScopeId, setEqState, setThemeMode, setVisualizerColors]);

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
    db.setSetting(ACTIVE_LIBRARY_SCOPE_KEY, activeLibraryScopeId ?? '').catch(console.error);
  }, [activeLibraryScopeId]);

  useEffect(() => {
    refreshVisibleLibrary(activeLibraryScopeId).catch(console.error);
  }, [activeLibraryScopeId, refreshVisibleLibrary]);

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

  useEffect(() => {
    let cancelled = false;
    let unlistenFocus: (() => void) | null = null;

    const syncPageFocus = () => {
      if (cancelled) return;
      const pageFocused = document.visibilityState === 'visible' && document.hasFocus();
      setWindowFocused(pageFocused);
    };

    const bindWindowSignals = async () => {
      try {
        const windowModule = await import('@tauri-apps/api/window');
        const appWindow = windowModule.getCurrentWindow?.();
        if (!appWindow) return;

        if (typeof (appWindow as any).onFocusChanged === 'function') {
          unlistenFocus = await (appWindow as any).onFocusChanged((event: { payload?: boolean }) => {
            if (cancelled) return;
            if (typeof event?.payload === 'boolean') {
              setWindowFocused(event.payload && document.visibilityState === 'visible');
            } else {
              syncPageFocus();
            }
          });
        }

        if (typeof (appWindow as any).isMinimized === 'function') {
          const minimized = await (appWindow as any).isMinimized();
          if (!cancelled && typeof minimized === 'boolean') {
            setWindowMinimized(minimized);
          }
        }
      } catch {
        // Browser/dev fallback without Tauri window APIs.
      }
    };

    syncPageFocus();
    window.addEventListener('focus', syncPageFocus);
    window.addEventListener('blur', syncPageFocus);
    document.addEventListener('visibilitychange', syncPageFocus);
    bindWindowSignals().catch(console.error);

    const minimizePoll = window.setInterval(async () => {
      try {
        const windowModule = await import('@tauri-apps/api/window');
        const appWindow = windowModule.getCurrentWindow?.();
        if (!appWindow || typeof (appWindow as any).isMinimized !== 'function') return;
        const minimized = await (appWindow as any).isMinimized();
        if (!cancelled && typeof minimized === 'boolean') {
          setWindowMinimized(minimized);
        }
      } catch {
        if (!cancelled) setWindowMinimized(false);
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(minimizePoll);
      window.removeEventListener('focus', syncPageFocus);
      window.removeEventListener('blur', syncPageFocus);
      document.removeEventListener('visibilitychange', syncPageFocus);
      unlistenFocus?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateWindowMode = async () => {
      try {
        const [windowModule, dpiModule] = await Promise.all([
          import('@tauri-apps/api/window'),
          import('@tauri-apps/api/dpi'),
        ]);
        const appWindow = windowModule.getCurrentWindow?.();
        if (!appWindow || cancelled) return;
        const canReadBounds = typeof (appWindow as any).outerSize === 'function'
          && typeof (appWindow as any).outerPosition === 'function';
        const canResize = typeof (appWindow as any).setSize === 'function';
        const canMove = typeof (appWindow as any).setPosition === 'function';

        if (playerMode === 'micro') {
          if (canReadBounds && !normalWindowBoundsRef.current) {
            const [size, position] = await Promise.all([
              (appWindow as any).outerSize(),
              (appWindow as any).outerPosition(),
            ]);
            const maybeBounds: unknown = {
              width: Number(size?.width),
              height: Number(size?.height),
              x: Number(position?.x),
              y: Number(position?.y),
            };
            if (isWindowBounds(maybeBounds)) {
              normalWindowBoundsRef.current = maybeBounds;
            }
          }
          if (canResize) {
            await (appWindow as any).setSize(new dpiModule.LogicalSize(520, 300));
          }
        } else if (normalWindowBoundsRef.current) {
          const bounds = normalWindowBoundsRef.current;
          if (canResize) {
            await (appWindow as any).setSize(new dpiModule.LogicalSize(bounds.width, bounds.height));
          }
          if (canMove) {
            await (appWindow as any).setPosition(new dpiModule.LogicalPosition(bounds.x, bounds.y));
          }
          normalWindowBoundsRef.current = null;
        }
      } catch {
        // Ignore in browser context and unsupported APIs.
      }
    };

    updateWindowMode().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [playerMode]);

  const processNewFile = useCallback(async (
    filePath: string,
    options?: { scopeId?: string; refreshVisible?: boolean }
  ): Promise<FileProcessingResult> => {
    const refreshVisible = options?.refreshVisible ?? true;
    const monitoredFolder = useSettingsStore.getState().monitoredFolder;
    const activeScope = options?.scopeId
      ?? useSettingsStore.getState().activeLibraryScopeId
      ?? (monitoredFolder ? scopeIdFromFolderPath(monitoredFolder) : MANUAL_LIBRARY_SCOPE_ID);

    try {
      const normalizedPath = normalizeFileSystemPath(filePath);
      if (!isImportableMp3Path(normalizedPath)) {
        return { status: 'skipped' };
      }

      const inFlightKey = `${activeScope}:${toFilePathKey(normalizedPath)}`;
      if (inFlightImportsRef.current.has(inFlightKey)) {
        return { status: 'existing' };
      }
      inFlightImportsRef.current.add(inFlightKey);

      const existing = await db.getTrackByFilePath(normalizedPath);

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

      await db.addTrack({
        title,
        artist,
        album: tags?.album ?? null,
        year: safeYear,
        genre: tags?.genre ?? null,
        duration: null,
        filePath: normalizedPath,
        libraryScopeId: activeScope,
        source: 'local',
        albumArtUrl: tags?.albumArt ?? null,
      });

      if (refreshVisible && activeScope === useSettingsStore.getState().activeLibraryScopeId) {
        await refreshVisibleLibrary(activeScope);
      }
      return { status: existing ? 'existing' : 'added' };
    } catch (err) {
      console.error('Error processing file:', filePath, err);
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failed', error: message };
    } finally {
      const normalizedPath = normalizeFileSystemPath(filePath);
      const inFlightKey = `${activeScope}:${toFilePathKey(normalizedPath)}`;
      inFlightImportsRef.current.delete(inFlightKey);
    }
  }, [refreshVisibleLibrary]);

  const processDeletedFile = useCallback(async (
    filePath: string,
    options?: { refreshVisible?: boolean }
  ): Promise<void> => {
    const normalizedPath = normalizeFileSystemPath(filePath);
    const existing = await db.getTrackByFilePath(normalizedPath);
    if (!existing) return;

    await db.deleteTrack(existing.id);
    if (usePlayerStore.getState().currentTrack?.id === existing.id) {
      audioRef.current?.stop();
      setPlaying(false);
      setCurrentTrack(null);
    }

    if (options?.refreshVisible !== false) {
      await refreshVisibleLibrary();
    }
  }, [refreshVisibleLibrary, setCurrentTrack, setPlaying]);

  // Listen for file watcher events
  useEffect(() => {
    let unlistenCreated: (() => void) | null = null;
    let unlistenDeleted: (() => void) | null = null;

    const bind = async () => {
      const resolveScopeForEvent = () => {
        const settings = useSettingsStore.getState();
        if (settings.activeLibraryScopeId) return settings.activeLibraryScopeId;
        if (settings.monitoredFolder) return scopeIdFromFolderPath(settings.monitoredFolder);
        return MANUAL_LIBRARY_SCOPE_ID;
      };

      unlistenCreated = await listen<string>('file-created', async (event) => {
        const scopeId = resolveScopeForEvent();
        const result = await processNewFile(event.payload, { scopeId, refreshVisible: true });
        if (result.status === 'failed' && result.error) {
          setToast({ message: `Import error: ${result.error}`, type: 'error' });
        }
      });

      unlistenDeleted = await listen<string>('file-deleted', async (event) => {
        await processDeletedFile(event.payload, { refreshVisible: true });
      });
    };

    bind().catch(console.error);
    return () => {
      unlistenCreated?.();
      unlistenDeleted?.();
    };
  }, [processDeletedFile, processNewFile]);

  const importFilesIntoLibrary = useCallback(async (files: string[], scopeId: string) => {
    let added = 0;
    let existing = 0;
    let skipped = 0;
    let failed = 0;
    let firstError: string | null = null;

    const normalizedFiles = [...new Set(files.map(normalizeFileSystemPath).filter(isImportableMp3Path))];
    for (const filePath of normalizedFiles) {
      const result = await processNewFile(filePath, { scopeId, refreshVisible: false });
      if (result.status === 'added') added += 1;
      if (result.status === 'existing') existing += 1;
      if (result.status === 'skipped') skipped += 1;
      if (result.status === 'failed') {
        failed += 1;
        if (!firstError && result.error) firstError = result.error;
      }
    }

    const tracks = await db.getTracksByScope(scopeId);
    setTracks(tracks);

    return { added, existing, skipped, failed, total: normalizedFiles.length, libraryCount: tracks.length, firstError };
  }, [processNewFile, setTracks]);

  const handleFolderSelected = async (folderPath: string) => {
    const normalizedFolder = normalizeFileSystemPath(folderPath);
    const scopeId = scopeIdFromFolderPath(normalizedFolder);
    setMonitoredFolder(normalizedFolder);
    setActiveLibraryScopeId(scopeId);
    setTracks([]);
    setSettingsVisible(false);
    await db.setSetting('monitored_folder', normalizedFolder);
    await db.setSetting(ACTIVE_LIBRARY_SCOPE_KEY, scopeId);
    setIsScanning(true);
    setActiveView('library');

    try {
      const files = (await scanFolder(normalizedFolder))
        .map(normalizeFileSystemPath)
        .filter(isImportableMp3Path);
      setToast({ message: `Found ${files.length} MP3 files. Scanning...`, type: 'info' });

      const summary = await importFilesIntoLibrary(files, scopeId);
      await startWatchingFolder(normalizedFolder);
      await cleanupLibraryRecords();
      const libraryCount = await refreshVisibleLibrary(scopeId);
      const summaryText = summary.failed > 0
        ? `Library loaded: ${libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.skipped} skipped, ${summary.failed} failed${summary.firstError ? `: ${summary.firstError}` : ''})`
        : `Library loaded: ${libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.skipped} skipped)`;
      setToast({ message: summaryText, type: 'success' });
    } catch (err) {
      setToast({ message: `Error scanning folder: ${err}`, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilesSelected = async (paths: string[]) => {
    const fallbackScope = activeLibraryScopeId ?? MANUAL_LIBRARY_SCOPE_ID;
    if (!activeLibraryScopeId) {
      setActiveLibraryScopeId(fallbackScope);
    }
    setSettingsVisible(false);
    setIsScanning(true);
    setActiveView('library');

    try {
      const mp3Files = paths
        .map(normalizeFileSystemPath)
        .filter(isImportableMp3Path);
      if (mp3Files.length === 0) {
        setToast({ message: 'No .mp3 files selected', type: 'error' });
        return;
      }

      setToast({ message: `Adding ${mp3Files.length} selected files...`, type: 'info' });
      const summary = await importFilesIntoLibrary(mp3Files, fallbackScope);
      await cleanupLibraryRecords();
      const libraryCount = await refreshVisibleLibrary(fallbackScope);
      const summaryText = summary.failed > 0
        ? `Library loaded: ${libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.skipped} skipped, ${summary.failed} failed${summary.firstError ? `: ${summary.firstError}` : ''})`
        : `Library loaded: ${libraryCount} tracks (${summary.added} added, ${summary.existing} existing, ${summary.skipped} skipped)`;
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
  const handleToggleMicroMode = useCallback(() => {
    setActiveView('player');
    setPlayerMode(playerMode === 'micro' ? 'mini' : 'micro');
  }, [playerMode, setActiveView, setPlayerMode]);

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
              {playerMode === 'expanded' ? 'Minimize' : 'Expand'}
            </button>
            <button
              onClick={handleToggleMicroMode}
              className={`terminal-btn px-4 py-2 ${playerMode === 'micro' ? 'terminal-btn-primary' : ''}`}
            >
              {playerMode === 'micro' ? 'Exit Micro' : 'Micro'}
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
            <div className={`js-active-panel panel mx-auto transition-all ${
              playerMode === 'expanded' ? 'max-w-5xl' : playerMode === 'micro' ? 'max-w-lg' : 'max-w-2xl'
            }`}>
              {playerMode === 'expanded' ? (
                <ExpandedPlayer
                  analyser={analyserNode}
                  leftAnalyser={stereoAnalysers.left}
                  rightAnalyser={stereoAnalysers.right}
                  visualizerActive={visualizerActive}
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
              ) : (
                <MiniPlayer
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                  analyser={analyserNode}
                  visualizerActive={visualizerActive}
                  compact={playerMode === 'micro'}
                />
              )}
            </div>
          )}

          {activeView === 'library' && (
            <div className="js-active-panel">
              <Library onCleanDuplicates={handleCleanDuplicates} isCleaning={isCleaningLibrary} />
            </div>
          )}
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
