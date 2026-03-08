import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { usePlayerStore } from '../../stores/playerStore';
import { EqualizerState } from '../../types/settings';
import { AlbumArt } from './AlbumArt';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';
import { Waveform } from '../visualizations/Waveform';
import { VUMeters } from '../visualizations/VUMeters';

interface ExpandedPlayerProps {
  analyser: AnalyserNode | null;
  leftAnalyser: AnalyserNode | null;
  rightAnalyser: AnalyserNode | null;
  equalizer: EqualizerState;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onEqBandChange: (index: number, gainDb: number) => void;
  onEqPreampChange: (gainDb: number) => void;
  onEqOutputChange: (output: number) => void;
  onEqBypassChange: (enabled: boolean) => void;
  onEqReset: () => void;
}
const EQ_BAND_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

function formatDb(value: number): string {
  const rounded = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
  if (Math.abs(rounded) < 0.05) return '0 dB';
  return `${rounded > 0 ? '+' : ''}${rounded} dB`;
}

function Fader({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  centerMarker = true,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
  centerMarker?: boolean;
}) {
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="eq-fader">
      <div className="eq-fader-value">{display}</div>
      <div className="eq-fader-slot">
        <div className="eq-fader-track" />
        {centerMarker && <div className="eq-fader-center" />}
        <div className="eq-fader-cap" style={{ bottom: `calc(${percent}% - 0.4rem)` }} />
        <input
          aria-label={`${label} fader`}
          className="eq-fader-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      <div className="eq-fader-label">{label}</div>
    </div>
  );
}

export function ExpandedPlayer({
  analyser,
  leftAnalyser,
  rightAnalyser,
  equalizer,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onEqBandChange,
  onEqPreampChange,
  onEqOutputChange,
  onEqBypassChange,
  onEqReset,
}: ExpandedPlayerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!panelRef.current) return;
    const animation = animate(panelRef.current.querySelectorAll('.js-expand-surface'), {
      opacity: [0.5, 1],
      translateY: [16, 0],
      scale: [0.992, 1],
      delay: (_el, index) => index * 85,
      duration: 620,
      ease: 'out(4)',
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
            <p className="text-sm">No track selected yet.</p>
            <p className="text-xs text-cosmic-light-teal/55">Select a track to view live waveform, VU, and EQ.</p>
          </div>
        </div>

        <div className="js-expand-surface space-y-4">
          <Waveform analyser={null} isPlaying={false} />
          <VUMeters analyser={null} leftAnalyser={null} rightAnalyser={null} isPlaying={false} />
        </div>

        <div className="text-center">
          <p className="text-lg">Select a track from Library to start playback</p>
          <p className="text-sm text-cosmic-light-teal/55">
            Equalizer and fader rack appear when playback is active.
          </p>
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
        </div>
      </div>

      {/* Visualizations */}
      <div className="js-expand-surface space-y-4 rounded-lg border border-cosmic-light-teal/20 bg-cosmic-teal/10 p-4">
        <Waveform analyser={analyser} isPlaying={isPlaying} />
        <VUMeters analyser={analyser} leftAnalyser={leftAnalyser} rightAnalyser={rightAnalyser} isPlaying={isPlaying} />
      </div>

      <div className="js-expand-surface sk-panel sk-eq-panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-cosmic-light-teal">Equalizer Rack</h3>
            <p className="text-xs text-cosmic-light-teal/65">10-band DSP with preamp and output faders</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEqReset} className="terminal-btn px-3 py-2 text-xs">
              Reset Flat
            </button>
            <button
              onClick={() => onEqBypassChange(!equalizer.bypass)}
              className={`terminal-btn px-3 py-2 text-xs ${equalizer.bypass ? 'terminal-btn-primary' : ''}`}
            >
              {equalizer.bypass ? 'Bypassed' : 'Bypass Off'}
            </button>
          </div>
        </div>

        <div className="eq-rack">
          <Fader
            label="PRE"
            value={equalizer.preampDb}
            min={-12}
            max={12}
            step={0.1}
            display={formatDb(equalizer.preampDb)}
            onChange={onEqPreampChange}
          />
          {equalizer.bands.map((bandGain, index) => (
            <Fader
              key={EQ_BAND_LABELS[index] ?? String(index)}
              label={EQ_BAND_LABELS[index] ?? String(index)}
              value={bandGain}
              min={-12}
              max={12}
              step={0.1}
              display={formatDb(bandGain)}
              onChange={(nextValue) => onEqBandChange(index, nextValue)}
            />
          ))}
          <Fader
            label="OUT"
            value={equalizer.output}
            min={0}
            max={1}
            step={0.01}
            display={`${Math.round(equalizer.output * 100)}%`}
            onChange={onEqOutputChange}
            centerMarker={false}
          />
        </div>
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
