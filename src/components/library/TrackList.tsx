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

function TrackRow({ track, index, tracks }: { track: Track; index: number; tracks: Track[] }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      onClick={() => setPlaybackContext(tracks, index)}
      className={`terminal-list-row flex cursor-pointer items-center gap-4 px-4 py-3 ${
        isActive ? 'terminal-list-row-active' : ''
      }`}
    >
      <AlbumArt url={track.albumArtUrl} album={track.album} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-cosmic-light-teal">{track.title}</p>
        <p className="truncate text-sm text-cosmic-light-teal/65">
          {track.artist || 'Unknown Artist'}
          {track.album && ` \u00b7 ${track.album}`}
        </p>
      </div>

      <div className="font-mono text-sm text-cosmic-light-teal/70">
        {formatDuration(track.duration)}
      </div>

      <div className="w-12 text-right text-xs uppercase text-cosmic-orange/80">
        {track.source}
      </div>
    </div>
  );
}

export function TrackList() {
  const filteredTracks = useLibraryStore((s) => s.filteredTracks);

  if (filteredTracks.length === 0) {
    return (
      <div className="p-8 text-center text-cosmic-light-teal/60">
        <p>No tracks found</p>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto">
      {filteredTracks.map((track, index) => (
        <TrackRow key={track.id} track={track} index={index} tracks={filteredTracks} />
      ))}
    </div>
  );
}
