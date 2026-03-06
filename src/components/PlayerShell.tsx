import { useEffect, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
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
import { scanFolder, startWatchingFolder, readFileBytes } from '../services/tauriCommands';
import * as db from '../services/database';

type ToastInfo = { message: string; type: 'success' | 'error' | 'info' };

export function PlayerShell() {
  const audioRef = useRef<AudioService | null>(null);
  const {
    currentTrack,
    setPlaying,
    setProgress,
    setDuration,
    queue,
    setCurrentTrack,
    setQueue,
    setVolume,
  } = usePlayerStore();
  const { setTracks, addTrack: addTrackToLibrary } = useLibraryStore();
  const setMonitoredFolder = useSettingsStore((s) => s.setMonitoredFolder);
  const { activeView, setActiveView, setSettingsVisible, togglePlayerMode, playerMode } = useUIStore();
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Initialize audio service
  useEffect(() => {
    const audio = new AudioService();
    audioRef.current = audio;

    audio.onProgress((p) => setProgress(p));
    audio.onEnd(() => {
      setPlaying(false);
      // Auto-advance to next track
      const { queue } = usePlayerStore.getState();
      if (queue.length > 0) {
        const next = queue[0];
        setCurrentTrack(next);
        setQueue(queue.slice(1));
      }
    });
    audio.onLoad((dur) => setDuration(dur));

    return () => audio.cleanup();
  }, [setProgress, setPlaying, setDuration, setCurrentTrack, setQueue]);

  // Load track when currentTrack changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      // For local files, use convertFileSrc or direct path
      audioRef.current.loadTrack(currentTrack.filePath);
      setTimeout(() => {
        audioRef.current?.play();
        setPlaying(true);
      }, 100);
    }
  }, [currentTrack, setPlaying]);

  // Load library on startup
  useEffect(() => {
    db.getAllTracks().then(setTracks).catch(console.error);
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

  // Listen for file watcher events
  useEffect(() => {
    const unlisten = listen<string>('file-created', async (event) => {
      await processNewFile(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const processNewFile = useCallback(async (filePath: string) => {
    try {
      // Check if already in library
      const existing = await db.getTrackByFilePath(filePath);
      if (existing) return;

      const bytes = await readFileBytes(filePath);
      const buffer = new Uint8Array(bytes).buffer;
      const tags = await parseID3Tags(buffer);

      const id = await db.addTrack({
        title: tags.title,
        artist: tags.artist,
        album: tags.album,
        year: tags.year,
        genre: tags.genre,
        duration: null,
        filePath,
        source: 'local',
        albumArtUrl: tags.albumArt,
      });

      addTrackToLibrary({
        id,
        title: tags.title,
        artist: tags.artist,
        album: tags.album,
        year: tags.year,
        genre: tags.genre,
        duration: 0,
        filePath,
        source: 'local',
        albumArtUrl: tags.albumArt,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      console.error('Error processing file:', filePath, err);
    }
  }, [addTrackToLibrary]);

  const handleFolderSelected = async (folderPath: string) => {
    setMonitoredFolder(folderPath);
    await db.setSetting('monitored_folder', folderPath);
    setIsScanning(true);

    try {
      const files = await scanFolder(folderPath);
      setToast({ message: `Found ${files.length} MP3 files. Scanning...`, type: 'info' });

      for (const filePath of files) {
        await processNewFile(filePath);
      }

      // Refresh library from DB
      const tracks = await db.getAllTracks();
      setTracks(tracks);

      await startWatchingFolder(folderPath);
      setToast({ message: `Library loaded: ${tracks.length} tracks`, type: 'success' });
    } catch (err) {
      setToast({ message: `Error scanning folder: ${err}`, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handlePlay = () => {
    audioRef.current?.play();
    setPlaying(true);
  };
  const handlePause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };
  const handleNext = () => {
    if (queue.length > 0) {
      setCurrentTrack(queue[0]);
      setQueue(queue.slice(1));
    }
  };
  const handlePrevious = () => {
    audioRef.current?.seek(0);
    setProgress(0);
  };
  const handleSeek = (pos: number) => {
    audioRef.current?.seek(pos);
    setProgress(pos);
  };
  const handleVolumeChange = (vol: number) => {
    audioRef.current?.setVolume(vol);
    setVolume(vol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-cosmic-teal to-gray-900 text-white">
      {/* Cosmic background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cosmic-orange/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cosmic-light-teal/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold font-mono tracking-wider">LOCAL PLAYER</h1>
          <div className="flex gap-2">
            <button
              onClick={togglePlayerMode}
              className="px-4 py-2 bg-cosmic-teal/30 hover:bg-cosmic-teal/50 rounded-lg transition-colors text-sm"
            >
              {playerMode === 'mini' ? 'Expand' : 'Minimize'}
            </button>
            <button
              onClick={() => setSettingsVisible(true)}
              className="px-4 py-2 bg-cosmic-teal/30 hover:bg-cosmic-teal/50 rounded-lg transition-colors text-sm"
            >
              Settings
            </button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="flex gap-2 mb-8">
          {(['player', 'library', 'playlists'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                activeView === view
                  ? 'bg-cosmic-orange text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {view}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="max-w-4xl mx-auto">
          {isScanning && <LoadingSpinner />}

          {activeView === 'player' && (
            <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-cosmic-light-teal/20">
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
                  analyser={audioRef.current?.getAnalyser() ?? null}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                />
              )}
            </div>
          )}

          {activeView === 'library' && <Library />}
          {activeView === 'playlists' && <PlaylistManager />}
        </main>
      </div>

      <Settings onFolderSelected={handleFolderSelected} />

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
