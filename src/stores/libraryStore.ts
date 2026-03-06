import { create } from 'zustand';
import { Track } from '../types/track';

type SourceFilter = 'all' | 'local' | 's3' | 'drive';

interface LibraryState {
  tracks: Track[];
  filteredTracks: Track[];
  sourceFilter: SourceFilter;
  searchQuery: string;

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: number) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  setSearchQuery: (query: string) => void;
  filterTracks: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  filteredTracks: [],
  sourceFilter: 'all',
  searchQuery: '',

  setTracks: (tracks) => {
    set({ tracks });
    get().filterTracks();
  },

  addTrack: (track) => {
    set((state) => ({ tracks: [...state.tracks, track] }));
    get().filterTracks();
  },

  removeTrack: (trackId) => {
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== trackId) }));
    get().filterTracks();
  },

  setSourceFilter: (filter) => {
    set({ sourceFilter: filter });
    get().filterTracks();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().filterTracks();
  },

  filterTracks: () => {
    const { tracks, sourceFilter, searchQuery } = get();
    let filtered = tracks;

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((t) => t.source === sourceFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist?.toLowerCase().includes(q) ||
          t.album?.toLowerCase().includes(q)
      );
    }

    set({ filteredTracks: filtered });
  },
}));
