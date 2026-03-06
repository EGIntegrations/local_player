import { usePlayerStore } from '../../stores/playerStore';
import { AlbumArt } from './AlbumArt';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';

interface MiniPlayerProps {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
}

export function MiniPlayer({
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
}: MiniPlayerProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!currentTrack) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No track playing</p>
        <p className="text-sm mt-2">Select a track from the library to play</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-center">
        <AlbumArt
          url={currentTrack.albumArtUrl}
          album={currentTrack.album}
          size="lg"
        />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">{currentTrack.title}</h2>
        <p className="text-gray-400">
          {currentTrack.artist || 'Unknown Artist'}
        </p>
        {currentTrack.album && (
          <p className="text-sm text-gray-500">{currentTrack.album}</p>
        )}
      </div>

      <SeekBar onSeek={onSeek} />

      <PlaybackControls
        onPlay={onPlay}
        onPause={onPause}
        onNext={onNext}
        onPrevious={onPrevious}
      />

      <div className="flex justify-center">
        <VolumeControl onChange={onVolumeChange} />
      </div>
    </div>
  );
}
