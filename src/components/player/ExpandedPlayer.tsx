import { usePlayerStore } from '../../stores/playerStore';
import { AlbumArt } from './AlbumArt';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';
import { Waveform } from '../visualizations/Waveform';
import { VUMeters } from '../visualizations/VUMeters';

interface ExpandedPlayerProps {
  analyser: AnalyserNode | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
}

export function ExpandedPlayer({
  analyser,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
}: ExpandedPlayerProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!currentTrack) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No track playing</p>
        <p className="text-sm mt-2">Select a track from the library to play</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top section: Album art + track info */}
      <div className="flex gap-6 items-start">
        <AlbumArt
          url={currentTrack.albumArtUrl}
          album={currentTrack.album}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white truncate">
            {currentTrack.title}
          </h2>
          <p className="text-lg text-gray-400">
            {currentTrack.artist || 'Unknown Artist'}
          </p>
          {currentTrack.album && (
            <p className="text-sm text-gray-500">{currentTrack.album}</p>
          )}
          {currentTrack.year && (
            <p className="text-xs text-gray-600 font-mono mt-1">{currentTrack.year}</p>
          )}
          {currentTrack.genre && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-cosmic-teal/30 text-cosmic-light-teal rounded font-mono">
              {currentTrack.genre}
            </span>
          )}
        </div>
      </div>

      {/* Visualizations */}
      <div className="space-y-4">
        <Waveform analyser={analyser} isPlaying={isPlaying} />
        <VUMeters analyser={analyser} isPlaying={isPlaying} />
      </div>

      {/* Seek bar */}
      <SeekBar onSeek={onSeek} />

      {/* Controls + Volume */}
      <div className="flex items-center justify-between">
        <VolumeControl onChange={onVolumeChange} />
        <PlaybackControls
          onPlay={onPlay}
          onPause={onPause}
          onNext={onNext}
          onPrevious={onPrevious}
        />
        <div className="w-32" /> {/* Spacer for symmetry */}
      </div>
    </div>
  );
}
