import { create } from 'zustand';
import { Track } from '../types/track';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  playbackOrder: Track[];
  playbackIndex: number;

  setCurrentTrack: (track: Track) => void;
  setPlaybackContext: (tracks: Track[], startIndex: number) => void;
  advancePlayback: (delta: 1 | -1) => Track | null;
  clearPlaybackContext: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setQueue: (queue: Track[]) => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  queue: [],
  playbackOrder: [],
  playbackIndex: -1,

  setCurrentTrack: (track) =>
    set((state) => {
      const index = state.playbackOrder.findIndex((candidate) => candidate.id === track.id);
      return {
        currentTrack: track,
        playbackIndex: index >= 0 ? index : state.playbackIndex,
      };
    }),
  setPlaybackContext: (tracks, startIndex) =>
    set(() => {
      const clampedIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const currentTrack = tracks.length > 0 ? tracks[clampedIndex] : null;
      return {
        playbackOrder: tracks,
        playbackIndex: tracks.length > 0 ? clampedIndex : -1,
        currentTrack,
      };
    }),
  advancePlayback: (delta) => {
    const state = get();
    const nextIndex = state.playbackIndex + delta;
    if (
      state.playbackOrder.length === 0 ||
      state.playbackIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= state.playbackOrder.length
    ) {
      return null;
    }

    const nextTrack = state.playbackOrder[nextIndex];
    set({
      playbackIndex: nextIndex,
      currentTrack: nextTrack,
    });
    return nextTrack;
  },
  clearPlaybackContext: () => set({ playbackOrder: [], playbackIndex: -1 }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setQueue: (queue) => set({ queue }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  clearQueue: () => set({ queue: [] }),
}));
