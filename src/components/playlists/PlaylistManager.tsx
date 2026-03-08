import { useEffect, useMemo, useState } from 'react';
import { usePlaylistStore } from '../../stores/playlistStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { AlbumArt } from '../player/AlbumArt';
import * as db from '../../services/database';

export function PlaylistManager() {
  const { playlists, setPlaylists, activePlaylist, setActivePlaylist, playlistTracks, setPlaylistTracks } =
    usePlaylistStore();
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const libraryTracks = useLibraryStore((s) => s.tracks);
  const [newName, setNewName] = useState('');
  const [trackSearch, setTrackSearch] = useState('');
  const [isAddingTrackId, setIsAddingTrackId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    db.getAllPlaylists().then(setPlaylists).catch(console.error);
  }, [setPlaylists]);

  useEffect(() => {
    if (activePlaylist) {
      db.getPlaylistTracks(activePlaylist.id).then(setPlaylistTracks).catch(console.error);
    }
  }, [activePlaylist, setPlaylistTracks]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await db.createPlaylist(newName.trim());
      setNewName('');
      const updated = await db.getAllPlaylists();
      setPlaylists(updated);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    await db.deletePlaylist(id);
    if (activePlaylist?.id === id) setActivePlaylist(null);
    const updated = await db.getAllPlaylists();
    setPlaylists(updated);
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      setPlaybackContext(playlistTracks, 0);
    }
  };

  const availableTracks = useMemo(() => {
    const existingIds = new Set(playlistTracks.map((track) => track.id));
    const q = trackSearch.trim().toLowerCase();
    return libraryTracks
      .filter((track) => !existingIds.has(track.id))
      .filter((track) => {
        if (!q) return true;
        return (
          track.title.toLowerCase().includes(q) ||
          track.artist?.toLowerCase().includes(q) ||
          track.album?.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [libraryTracks, playlistTracks, trackSearch]);

  const handleAddTrack = async (trackId: number) => {
    if (!activePlaylist) return;
    setIsAddingTrackId(trackId);
    try {
      await db.addTrackToPlaylist(activePlaylist.id, trackId, playlistTracks.length);
      const updatedTracks = await db.getPlaylistTracks(activePlaylist.id);
      setPlaylistTracks(updatedTracks);
    } finally {
      setIsAddingTrackId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <h2 className="panel-title mb-4 text-xl font-bold font-mono">Create Playlist</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name..."
            className="terminal-input flex-1 px-4 py-2"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newName.trim()}
            className="terminal-btn terminal-btn-primary px-6 py-2"
          >
            Create
          </button>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="panel-title mb-4 text-xl font-bold font-mono">Your Playlists</h2>
        {playlists.length === 0 ? (
          <p className="text-cosmic-light-teal/65">No playlists yet</p>
        ) : (
          <div className="space-y-2">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setActivePlaylist(pl)}
                className={`terminal-list-row flex cursor-pointer items-center justify-between rounded-lg p-3 ${
                  activePlaylist?.id === pl.id ? 'terminal-list-row-active' : ''
                }`}
              >
                <span className="font-medium text-cosmic-light-teal">{pl.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(pl.id);
                  }}
                  className="terminal-btn p-1 text-cosmic-light-teal/70 hover:text-red-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activePlaylist && (
        <div className="space-y-4">
          <div className="panel p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="panel-title text-xl font-bold font-mono">{activePlaylist.name}</h2>
              <button
                onClick={handlePlayAll}
                disabled={playlistTracks.length === 0}
                className="terminal-btn terminal-btn-primary px-4 py-2"
              >
                Play All
              </button>
            </div>
            {playlistTracks.length === 0 ? (
              <p className="text-cosmic-light-teal/65">No tracks in this playlist yet</p>
            ) : (
              <div className="space-y-2">
                {playlistTracks.map((track) => (
                  <div
                    key={track.id}
                    className="terminal-list-row flex cursor-pointer items-center gap-3 rounded p-2"
                    onClick={() => {
                      const index = playlistTracks.findIndex((candidate) => candidate.id === track.id);
                      if (index >= 0) {
                        setPlaybackContext(playlistTracks, index);
                      }
                    }}
                  >
                    <AlbumArt url={track.albumArtUrl} album={track.album} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-cosmic-light-teal">{track.title}</p>
                      <p className="truncate text-sm text-cosmic-light-teal/65">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-6">
            <h3 className="panel-title mb-3 text-lg font-semibold">Add Tracks</h3>
            <input
              type="text"
              value={trackSearch}
              onChange={(event) => setTrackSearch(event.target.value)}
              placeholder="Search library to add..."
              className="terminal-input mb-3 w-full px-3 py-2"
            />
            {libraryTracks.length === 0 ? (
              <p className="text-cosmic-light-teal/65">Import tracks in Library first.</p>
            ) : availableTracks.length === 0 ? (
              <p className="text-cosmic-light-teal/65">No matching tracks available to add.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {availableTracks.map((track) => (
                  <div key={track.id} className="terminal-list-row flex items-center gap-3 rounded p-2">
                    <AlbumArt url={track.albumArtUrl} album={track.album} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-cosmic-light-teal">{track.title}</p>
                      <p className="truncate text-sm text-cosmic-light-teal/65">{track.artist || 'Unknown Artist'}</p>
                    </div>
                    <button
                      onClick={() => handleAddTrack(track.id)}
                      disabled={isAddingTrackId === track.id}
                      className="terminal-btn px-3 py-1 text-xs"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
