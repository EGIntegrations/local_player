import { usePlayerStore } from '../../stores/playerStore';
import { AlbumArt } from './AlbumArt';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';
import { Waveform } from '../visualizations/Waveform';

interface MiniPlayerProps {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  analyser: AnalyserNode | null;
  visualizerActive: boolean;
  compact?: boolean;
}

export function MiniPlayer({
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  analyser,
  visualizerActive,
  compact = false,
}: MiniPlayerProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!currentTrack) {
    return (
      <div className={`${compact ? 'p-3' : 'p-8'} text-center text-cosmic-light-teal/65`}>
        <p>No track playing</p>
        <p className="mt-2 text-sm">Select a track from the library to play</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2 p-3">
        <div className="min-w-0 text-center">
          <h2 className="truncate text-sm font-semibold text-cosmic-light-teal">{currentTrack.title}</h2>
          <p className="truncate text-xs text-cosmic-light-teal/75">{currentTrack.artist || 'Unknown Artist'}</p>
        </div>

        <Waveform analyser={analyser} isPlaying={isPlaying} active={visualizerActive} compact />
        <SeekBar onSeek={onSeek} />

        <div className="flex items-center justify-between gap-2">
          <PlaybackControls
            onPlay={onPlay}
            onPause={onPause}
            onNext={onNext}
            onPrevious={onPrevious}
          />
          <VolumeControl onChange={onVolumeChange} />
        </div>
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
        <h2 className="text-xl font-semibold text-cosmic-light-teal">{currentTrack.title}</h2>
        <p className="text-cosmic-light-teal/75">
          {currentTrack.artist || 'Unknown Artist'}
        </p>
        {currentTrack.album && (
          <p className="text-sm text-cosmic-light-teal/55">{currentTrack.album}</p>
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
