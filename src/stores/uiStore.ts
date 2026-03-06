import { create } from 'zustand';

type PlayerMode = 'mini' | 'expanded';
type ActiveView = 'player' | 'library' | 'playlists';

interface UIState {
  playerMode: PlayerMode;
  settingsVisible: boolean;
  activeView: ActiveView;

  setPlayerMode: (mode: PlayerMode) => void;
  togglePlayerMode: () => void;
  setSettingsVisible: (visible: boolean) => void;
  setActiveView: (view: ActiveView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  playerMode: 'mini',
  settingsVisible: false,
  activeView: 'player',

  setPlayerMode: (mode) => set({ playerMode: mode }),
  togglePlayerMode: () =>
    set((state) => ({
      playerMode: state.playerMode === 'mini' ? 'expanded' : 'mini',
    })),
  setSettingsVisible: (visible) => set({ settingsVisible: visible }),
  setActiveView: (view) => set({ activeView: view }),
}));
