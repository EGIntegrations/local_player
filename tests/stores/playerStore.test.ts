import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../src/stores/playerStore';
import { Track } from '../../src/types/track';

const mockTrack: Track = {
  id: 1,
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  year: 2024,
  genre: 'Rock',
  duration: 180,
  filePath: '/music/test.mp3',
  source: 'local',
  albumArtUrl: null,
  createdAt: 1000,
  updatedAt: 1000,
};

const mockTrack2: Track = {
  ...mockTrack,
  id: 2,
  title: 'Second Song',
};

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      volume: 0.7,
      progress: 0,
      duration: 0,
      queue: [],
      playbackOrder: [],
      playbackIndex: -1,
    });
  });

  it('should initialize with default state', () => {
    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(0.7);
    expect(state.progress).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.queue).toEqual([]);
    expect(state.playbackOrder).toEqual([]);
    expect(state.playbackIndex).toBe(-1);
  });

  it('should set current track', () => {
    usePlayerStore.getState().setCurrentTrack(mockTrack);
    expect(usePlayerStore.getState().currentTrack).toEqual(mockTrack);
  });

  it('should toggle playing state', () => {
    usePlayerStore.getState().setPlaying(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    usePlayerStore.getState().setPlaying(false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('should set volume', () => {
    usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
  });

  it('should set progress and duration', () => {
    usePlayerStore.getState().setProgress(45);
    usePlayerStore.getState().setDuration(180);
    expect(usePlayerStore.getState().progress).toBe(45);
    expect(usePlayerStore.getState().duration).toBe(180);
  });

  it('should manage queue', () => {
    usePlayerStore.getState().setQueue([mockTrack, mockTrack2]);
    expect(usePlayerStore.getState().queue).toHaveLength(2);

    usePlayerStore.getState().addToQueue(mockTrack);
    expect(usePlayerStore.getState().queue).toHaveLength(3);

    usePlayerStore.getState().clearQueue();
    expect(usePlayerStore.getState().queue).toEqual([]);
  });

  it('should set playback context and current track', () => {
    usePlayerStore.getState().setPlaybackContext([mockTrack, mockTrack2], 1);
    const state = usePlayerStore.getState();
    expect(state.playbackOrder).toEqual([mockTrack, mockTrack2]);
    expect(state.playbackIndex).toBe(1);
    expect(state.currentTrack).toEqual(mockTrack2);
  });

  it('should advance playback and stop at boundaries', () => {
    usePlayerStore.getState().setPlaybackContext([mockTrack, mockTrack2], 0);
    const movedForward = usePlayerStore.getState().advancePlayback(1);
    expect(movedForward).toEqual(mockTrack2);
    expect(usePlayerStore.getState().playbackIndex).toBe(1);

    const atEnd = usePlayerStore.getState().advancePlayback(1);
    expect(atEnd).toBeNull();
    expect(usePlayerStore.getState().playbackIndex).toBe(1);

    const movedBack = usePlayerStore.getState().advancePlayback(-1);
    expect(movedBack).toEqual(mockTrack);
    expect(usePlayerStore.getState().playbackIndex).toBe(0);
  });
});
