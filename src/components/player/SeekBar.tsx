import { usePlayerStore } from '../../stores/playerStore';

interface SeekBarProps {
  onSeek: (position: number) => void;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SeekBar({ onSeek }: SeekBarProps) {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);

  return (
    <div className="w-full">
      <input
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={progress}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="terminal-slider w-full"
        aria-label="Seek"
      />
      <div className="mt-1 flex justify-between font-mono text-xs text-cosmic-light-teal/65">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
