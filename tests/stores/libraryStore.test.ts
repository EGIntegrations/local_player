import { describe, it, expect, beforeEach } from 'vitest';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { Track } from '../../src/types/track';

const makeTrack = (overrides: Partial<Track> = {}): Track => ({
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
  ...overrides,
});

describe('libraryStore', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      tracks: [],
      filteredTracks: [],
      sourceFilter: 'all',
      searchQuery: '',
    });
  });

  it('should set tracks and update filtered', () => {
    const tracks = [makeTrack({ id: 1 }), makeTrack({ id: 2, title: 'Other' })];
    useLibraryStore.getState().setTracks(tracks);

    expect(useLibraryStore.getState().tracks).toHaveLength(2);
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(2);
  });

  it('should add a track', () => {
    useLibraryStore.getState().addTrack(makeTrack({ id: 1 }));
    expect(useLibraryStore.getState().tracks).toHaveLength(1);
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(1);
  });

  it('should remove a track', () => {
    useLibraryStore.getState().setTracks([makeTrack({ id: 1 }), makeTrack({ id: 2 })]);
    useLibraryStore.getState().removeTrack(1);
    expect(useLibraryStore.getState().tracks).toHaveLength(1);
    expect(useLibraryStore.getState().tracks[0].id).toBe(2);
  });

  it('should filter by source', () => {
    useLibraryStore.getState().setTracks([
      makeTrack({ id: 1, source: 'local' }),
      makeTrack({ id: 2, source: 's3' }),
      makeTrack({ id: 3, source: 'drive' }),
    ]);

    useLibraryStore.getState().setSourceFilter('local');
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(1);
    expect(useLibraryStore.getState().filteredTracks[0].source).toBe('local');

    useLibraryStore.getState().setSourceFilter('all');
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(3);
  });

  it('should filter by search query', () => {
    useLibraryStore.getState().setTracks([
      makeTrack({ id: 1, title: 'Bohemian Rhapsody', artist: 'Queen' }),
      makeTrack({ id: 2, title: 'Stairway to Heaven', artist: 'Led Zeppelin' }),
      makeTrack({ id: 3, title: 'Hotel California', artist: 'Eagles' }),
    ]);

    useLibraryStore.getState().setSearchQuery('queen');
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(1);
    expect(useLibraryStore.getState().filteredTracks[0].title).toBe('Bohemian Rhapsody');
  });

  it('should search across title, artist, and album', () => {
    useLibraryStore.getState().setTracks([
      makeTrack({ id: 1, title: 'Song', artist: 'Artist', album: 'Special Album' }),
      makeTrack({ id: 2, title: 'Special Song', artist: 'Other', album: 'Other' }),
    ]);

    useLibraryStore.getState().setSearchQuery('special');
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(2);
  });

  it('should combine source filter and search', () => {
    useLibraryStore.getState().setTracks([
      makeTrack({ id: 1, title: 'Local Hit', source: 'local' }),
      makeTrack({ id: 2, title: 'Cloud Hit', source: 's3' }),
      makeTrack({ id: 3, title: 'Local Miss', source: 'local' }),
    ]);

    useLibraryStore.getState().setSourceFilter('local');
    useLibraryStore.getState().setSearchQuery('hit');
    expect(useLibraryStore.getState().filteredTracks).toHaveLength(1);
    expect(useLibraryStore.getState().filteredTracks[0].title).toBe('Local Hit');
  });
});
