import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      playerMode: 'mini',
      settingsVisible: false,
      activeView: 'player',
    });
  });

  it('should initialize with default state', () => {
    const state = useUIStore.getState();
    expect(state.playerMode).toBe('mini');
    expect(state.settingsVisible).toBe(false);
    expect(state.activeView).toBe('player');
  });

  it('should toggle player mode', () => {
    useUIStore.getState().togglePlayerMode();
    expect(useUIStore.getState().playerMode).toBe('expanded');
    useUIStore.getState().togglePlayerMode();
    expect(useUIStore.getState().playerMode).toBe('mini');
  });

  it('should set player mode directly', () => {
    useUIStore.getState().setPlayerMode('expanded');
    expect(useUIStore.getState().playerMode).toBe('expanded');
  });

  it('should toggle settings visibility', () => {
    useUIStore.getState().setSettingsVisible(true);
    expect(useUIStore.getState().settingsVisible).toBe(true);
    useUIStore.getState().setSettingsVisible(false);
    expect(useUIStore.getState().settingsVisible).toBe(false);
  });

  it('should switch active view', () => {
    useUIStore.getState().setActiveView('library');
    expect(useUIStore.getState().activeView).toBe('library');
    useUIStore.getState().setActiveView('playlists');
    expect(useUIStore.getState().activeView).toBe('playlists');
  });
});
