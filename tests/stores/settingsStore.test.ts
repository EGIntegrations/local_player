import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../src/stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      monitoredFolder: null,
      s3Configured: false,
      driveConfigured: false,
      theme: 'dark',
    });
  });

  it('should initialize with default state', () => {
    const state = useSettingsStore.getState();
    expect(state.monitoredFolder).toBeNull();
    expect(state.s3Configured).toBe(false);
    expect(state.driveConfigured).toBe(false);
    expect(state.theme).toBe('dark');
  });

  it('should set monitored folder', () => {
    useSettingsStore.getState().setMonitoredFolder('/home/user/Music');
    expect(useSettingsStore.getState().monitoredFolder).toBe('/home/user/Music');
  });

  it('should set S3 configured', () => {
    useSettingsStore.getState().setS3Configured(true);
    expect(useSettingsStore.getState().s3Configured).toBe(true);
  });

  it('should set Drive configured', () => {
    useSettingsStore.getState().setDriveConfigured(true);
    expect(useSettingsStore.getState().driveConfigured).toBe(true);
  });

  it('should set theme', () => {
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
