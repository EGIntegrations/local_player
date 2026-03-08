import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExpandedPlayer } from '../../src/components/player/ExpandedPlayer';
import { usePlayerStore } from '../../src/stores/playerStore';
import { EqualizerState } from '../../src/types/settings';

const eqState: EqualizerState = {
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  preampDb: 0,
  output: 1,
  bypass: false,
};

describe('ExpandedPlayer equalizer rack', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: {
        id: 1,
        title: 'Track One',
        artist: 'Artist',
        album: 'Album',
        year: 2025,
        genre: 'Electronic',
        duration: 180,
        filePath: '/tmp/track.mp3',
        source: 'local',
        albumArtUrl: null,
        createdAt: 1,
        updatedAt: 1,
      },
      isPlaying: false,
      volume: 0.7,
      progress: 0,
      duration: 0,
      queue: [],
      playbackOrder: [],
      playbackIndex: -1,
    });
  });

  it('renders equalizer controls and emits fader changes', () => {
    const onEqBandChange = vi.fn();
    const onEqBypassChange = vi.fn();

    render(
      <ExpandedPlayer
        analyser={null}
        leftAnalyser={null}
        rightAnalyser={null}
        equalizer={eqState}
        onPlay={() => undefined}
        onPause={() => undefined}
        onNext={() => undefined}
        onPrevious={() => undefined}
        onSeek={() => undefined}
        onVolumeChange={() => undefined}
        onEqBandChange={onEqBandChange}
        onEqPreampChange={() => undefined}
        onEqOutputChange={() => undefined}
        onEqBypassChange={onEqBypassChange}
        onEqReset={() => undefined}
      />
    );

    expect(screen.getByText('Equalizer Rack')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('31 fader'), { target: { value: '4.5' } });
    expect(onEqBandChange).toHaveBeenCalledWith(0, 4.5);

    fireEvent.click(screen.getByRole('button', { name: 'Bypass Off' }));
    expect(onEqBypassChange).toHaveBeenCalledWith(true);
  });
});
