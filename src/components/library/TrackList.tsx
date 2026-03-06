import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { AlbumArt } from '../player/AlbumArt';
import { Track } from '../../types/track';

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TrackRow({ track }: { track: Track }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      onClick={() => setCurrentTrack(track)}
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-700/50 transition-colors ${
        isActive ? 'bg-cosmic-teal/20' : ''
      }`}
    >
      <AlbumArt url={track.albumArtUrl} album={track.album} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{track.title}</p>
        <p className="text-gray-400 text-sm truncate">
          {track.artist || 'Unknown Artist'}
          {track.album && ` \u00b7 ${track.album}`}
        </p>
      </div>

      <div className="text-gray-400 text-sm font-mono">
        {formatDuration(track.duration)}
      </div>

      <div className="w-12 text-xs text-gray-500 text-right uppercase">
        {track.source}
      </div>
    </div>
  );
}

export function TrackList() {
  const filteredTracks = useLibraryStore((s) => s.filteredTracks);

  if (filteredTracks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No tracks found</p>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto">
      {filteredTracks.map((track) => (
        <TrackRow key={track.id} track={track} />
      ))}
    </div>
  );
}
