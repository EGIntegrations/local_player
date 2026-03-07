import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackList } from '../../src/components/library/TrackList';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { usePlayerStore } from '../../src/stores/playerStore';
import { Track } from '../../src/types/track';

const tracks: Track[] = [
  {
    id: 101,
    title: 'First Song',
    artist: 'First Artist',
    album: 'Album A',
    year: 2024,
    genre: 'Electronic',
    duration: 180,
    filePath: '/music/first.mp3',
    source: 'local',
    albumArtUrl: null,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 102,
    title: 'Second Song',
    artist: 'Second Artist',
    album: 'Album B',
    year: 2024,
    genre: 'Electronic',
    duration: 190,
    filePath: '/music/second.mp3',
    source: 'local',
    albumArtUrl: null,
    createdAt: 1,
    updatedAt: 1,
  },
];

describe('TrackList playback context', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      tracks,
      filteredTracks: tracks,
      sourceFilter: 'all',
      searchQuery: '',
    });
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

  it('sets playback context from filtered library order when selecting a row', () => {
    render(<TrackList />);

    fireEvent.click(screen.getByText('Second Song'));

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe(102);
    expect(state.playbackOrder.map((track) => track.id)).toEqual([101, 102]);
    expect(state.playbackIndex).toBe(1);
  });
});
