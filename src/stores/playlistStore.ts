import { create } from 'zustand';
import { Playlist } from '../types/playlist';
import { Track } from '../types/track';

interface PlaylistState {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  playlistTracks: Track[];

  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  setActivePlaylist: (playlist: Playlist | null) => void;
  setPlaylistTracks: (tracks: Track[]) => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  playlists: [],
  activePlaylist: null,
  playlistTracks: [],

  setPlaylists: (playlists) => set({ playlists }),
  addPlaylist: (playlist) =>
    set((state) => ({ playlists: [...state.playlists, playlist] })),
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
  setPlaylistTracks: (tracks) => set({ playlistTracks: tracks }),
}));
