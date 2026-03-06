import { useEffect, useState } from 'react';
import { usePlaylistStore } from '../../stores/playlistStore';
import { usePlayerStore } from '../../stores/playerStore';
import { AlbumArt } from '../player/AlbumArt';
import * as db from '../../services/database';

export function PlaylistManager() {
  const { playlists, setPlaylists, activePlaylist, setActivePlaylist, playlistTracks, setPlaylistTracks } =
    usePlaylistStore();
  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [newName, setNewName] = useState('');
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
      setCurrentTrack(playlistTracks[0]);
      setQueue(playlistTracks.slice(1));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-cosmic-light-teal/20 p-6">
        <h2 className="text-xl font-bold font-mono text-white mb-4">Create Playlist</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name..."
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newName.trim()}
            className="px-6 py-2 bg-cosmic-orange hover:bg-cosmic-apricot disabled:bg-gray-600 rounded-lg transition-colors text-white"
          >
            Create
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-cosmic-light-teal/20 p-6">
        <h2 className="text-xl font-bold font-mono text-white mb-4">Your Playlists</h2>
        {playlists.length === 0 ? (
          <p className="text-gray-400">No playlists yet</p>
        ) : (
          <div className="space-y-2">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setActivePlaylist(pl)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activePlaylist?.id === pl.id ? 'bg-cosmic-teal/20' : 'hover:bg-gray-700'
                }`}
              >
                <span className="font-medium text-white">{pl.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(pl.id);
                  }}
                  className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white"
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
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-cosmic-light-teal/20 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-mono text-white">{activePlaylist.name}</h2>
            <button
              onClick={handlePlayAll}
              disabled={playlistTracks.length === 0}
              className="px-4 py-2 bg-cosmic-orange hover:bg-cosmic-apricot disabled:bg-gray-600 rounded-lg transition-colors text-white"
            >
              Play All
            </button>
          </div>
          {playlistTracks.length === 0 ? (
            <p className="text-gray-400">No tracks in this playlist</p>
          ) : (
            <div className="space-y-2">
              {playlistTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer"
                  onClick={() => setCurrentTrack(track)}
                >
                  <AlbumArt url={track.albumArtUrl} album={track.album} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{track.title}</p>
                    <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
