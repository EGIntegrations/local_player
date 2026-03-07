import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
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

function SynthKnob({ label, value, isPlaying }: { label: string; value: number; isPlaying: boolean }) {
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const baseRotation = -135 + value * 270;

  useEffect(() => {
    if (!pointerRef.current) return;
    const intro = animate(pointerRef.current, {
      rotate: [baseRotation - 18, baseRotation],
      duration: 520,
      ease: 'out(3)',
    });

    let idle: { pause: () => void } | null = null;
    if (isPlaying) {
      idle = animate(pointerRef.current, {
        rotate: [baseRotation - 5, baseRotation + 5],
        duration: 1800,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      });
    }

    return () => {
      intro.pause();
      idle?.pause();
    };
  }, [baseRotation, isPlaying]);

  return (
    <div className="text-center js-knob">
      <div className="relative mx-auto h-20 w-20 rounded-full border-2 border-cosmic-light-teal/45 bg-cosmic-teal/25 shadow-[inset_0_6px_12px_rgba(0,0,0,0.18)]">
        {Array.from({ length: 13 }).map((_, index) => {
          const rotation = -135 + index * 22.5;
          return (
            <div
              key={index}
              className="absolute left-1/2 top-1/2 h-1 w-0.5 origin-bottom bg-cosmic-light-teal/65"
              style={{
                transform: `translate(-50%, -125%) rotate(${rotation}deg)`,
              }}
            />
          );
        })}
        <div className="absolute inset-[11px] rounded-full border border-cosmic-light-teal/35 bg-[linear-gradient(150deg,rgba(243,210,165,0.35),rgba(58,121,115,0.45))]" />
        <div
          ref={pointerRef}
          className="absolute h-[2px] w-8 rounded bg-cosmic-orange shadow-[0_0_8px_rgba(225,131,58,0.4)]"
          style={{ top: '50%', left: '50%', transformOrigin: '0% 50%', transform: `rotate(${baseRotation}deg)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cosmic-light-teal/60 bg-cosmic-apricot" />
      </div>
      <div className="mt-2 font-mono text-xs uppercase tracking-widest text-cosmic-light-teal/70">{label}</div>
    </div>
  );
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!panelRef.current) return;
    const animation = animate(panelRef.current.querySelectorAll('.js-expand-surface'), {
      opacity: [0.6, 1],
      translateY: [10, 0],
      delay: (_el, index) => index * 70,
      duration: 500,
      ease: 'out(3)',
    });
    return () => {
      animation.pause();
    };
  }, [currentTrack?.id]);

  if (!currentTrack) {
    return (
      <div ref={panelRef} className="space-y-6 p-8 text-cosmic-light-teal/65">
        <div className="js-expand-surface grid gap-6 rounded-lg border border-cosmic-light-teal/30 bg-cosmic-teal/15 p-4 md:grid-cols-[auto_1fr]">
          <AlbumArt url={null} album={null} size="md" />
          <div className="space-y-2">
            <p className="soft-label">Expanded Mode</p>
            <p className="text-lg text-cosmic-light-teal">World Fair Listening Deck</p>
            <p className="text-sm">No track selected yet.</p>
            <div className="flex gap-6 pt-2">
              <SynthKnob label="Drive" value={0.42} isPlaying={false} />
              <SynthKnob label="Air" value={0.68} isPlaying={false} />
            </div>
          </div>
        </div>

        <div className="js-expand-surface space-y-4">
          <Waveform analyser={null} isPlaying={false} />
          <VUMeters analyser={null} isPlaying={false} />
        </div>

        <div className="text-center">
          <p className="text-lg">Select a track from Library to start playback</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="space-y-6 p-6">
      {/* Top section: Album art + track info */}
      <div className="js-expand-surface grid gap-6 md:grid-cols-[auto_1fr]">
        <AlbumArt
          url={currentTrack.albumArtUrl}
          album={currentTrack.album}
          size="md"
        />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold text-cosmic-light-teal">
            {currentTrack.title}
          </h2>
          <p className="text-lg text-cosmic-light-teal/75">
            {currentTrack.artist || 'Unknown Artist'}
          </p>
          {currentTrack.album && (
            <p className="text-sm text-cosmic-light-teal/55">{currentTrack.album}</p>
          )}
          {currentTrack.year && (
            <p className="mt-1 font-mono text-xs text-cosmic-light-teal/45">{currentTrack.year}</p>
          )}
          {currentTrack.genre && (
            <span className="mt-2 inline-block rounded border border-cosmic-light-teal/35 bg-cosmic-teal/75 px-2 py-0.5 font-mono text-xs text-cosmic-light-teal">
              {currentTrack.genre}
            </span>
          )}

          <div className="mt-4 flex gap-6">
            <SynthKnob label="Drive" value={0.57} isPlaying={isPlaying} />
            <SynthKnob label="Presence" value={0.48} isPlaying={isPlaying} />
            <SynthKnob label="Space" value={0.64} isPlaying={isPlaying} />
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="js-expand-surface space-y-4 rounded-lg border border-cosmic-light-teal/20 bg-cosmic-teal/10 p-4">
        <Waveform analyser={analyser} isPlaying={isPlaying} />
        <VUMeters analyser={analyser} isPlaying={isPlaying} />
      </div>

      {/* Seek bar */}
      <div className="js-expand-surface">
        <SeekBar onSeek={onSeek} />
      </div>

      {/* Controls + Volume */}
      <div className="js-expand-surface flex flex-wrap items-center justify-between gap-4">
        <VolumeControl onChange={onVolumeChange} />
        <PlaybackControls
          onPlay={onPlay}
          onPause={onPause}
          onNext={onNext}
          onPrevious={onPrevious}
        />
        <div className="w-24" />
      </div>
    </div>
  );
}
