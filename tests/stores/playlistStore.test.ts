import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaylistStore } from '../../src/stores/playlistStore';
import { Playlist } from '../../src/types/playlist';
import { Track } from '../../src/types/track';

const makePlaylist = (overrides: Partial<Playlist> = {}): Playlist => ({
  id: 1,
  name: 'Test Playlist',
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

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

describe('playlistStore', () => {
  beforeEach(() => {
    usePlaylistStore.setState({
      playlists: [],
      activePlaylist: null,
      playlistTracks: [],
    });
  });

  it('should initialize with empty state', () => {
    const state = usePlaylistStore.getState();
    expect(state.playlists).toEqual([]);
    expect(state.activePlaylist).toBeNull();
    expect(state.playlistTracks).toEqual([]);
  });

  it('should set playlists', () => {
    const playlists = [makePlaylist({ id: 1 }), makePlaylist({ id: 2, name: 'Other' })];
    usePlaylistStore.getState().setPlaylists(playlists);
    expect(usePlaylistStore.getState().playlists).toHaveLength(2);
  });

  it('should add a playlist', () => {
    usePlaylistStore.getState().addPlaylist(makePlaylist({ id: 1 }));
    usePlaylistStore.getState().addPlaylist(makePlaylist({ id: 2, name: 'Second' }));
    expect(usePlaylistStore.getState().playlists).toHaveLength(2);
  });

  it('should set active playlist', () => {
    const playlist = makePlaylist({ id: 1, name: 'Active' });
    usePlaylistStore.getState().setActivePlaylist(playlist);
    expect(usePlaylistStore.getState().activePlaylist).toEqual(playlist);

    usePlaylistStore.getState().setActivePlaylist(null);
    expect(usePlaylistStore.getState().activePlaylist).toBeNull();
  });

  it('should set playlist tracks', () => {
    const tracks = [makeTrack({ id: 1 }), makeTrack({ id: 2 })];
    usePlaylistStore.getState().setPlaylistTracks(tracks);
    expect(usePlaylistStore.getState().playlistTracks).toHaveLength(2);
  });
});
