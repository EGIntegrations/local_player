import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../src/stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      monitoredFolder: null,
      s3Configured: false,
      driveConfigured: false,
      themeMode: 'system',
      resolvedTheme: 'light',
      equalizer: {
        bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        preampDb: 0,
        output: 1,
        bypass: false,
      },
    });
  });

  it('should initialize with default state', () => {
    const state = useSettingsStore.getState();
    expect(state.monitoredFolder).toBeNull();
    expect(state.s3Configured).toBe(false);
    expect(state.driveConfigured).toBe(false);
    expect(state.themeMode).toBe('system');
    expect(state.resolvedTheme).toBe('light');
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

  it('should set theme mode and resolved theme', () => {
    useSettingsStore.getState().setThemeMode('dark');
    expect(useSettingsStore.getState().themeMode).toBe('dark');

    useSettingsStore.getState().setResolvedTheme('dark');
    expect(useSettingsStore.getState().resolvedTheme).toBe('dark');

    useSettingsStore.getState().setThemeMode('system');
    useSettingsStore.getState().syncResolvedTheme(false);
    expect(useSettingsStore.getState().resolvedTheme).toBe('light');
    useSettingsStore.getState().syncResolvedTheme(true);
    expect(useSettingsStore.getState().resolvedTheme).toBe('dark');
  });

  it('should clamp equalizer band, preamp and output values', () => {
    useSettingsStore.getState().setEqBandGain(0, 18);
    useSettingsStore.getState().setEqBandGain(1, -20);
    useSettingsStore.getState().setEqPreamp(99);
    useSettingsStore.getState().setEqOutput(-4);

    const eq = useSettingsStore.getState().equalizer;
    expect(eq.bands[0]).toBe(12);
    expect(eq.bands[1]).toBe(-12);
    expect(eq.preampDb).toBe(12);
    expect(eq.output).toBe(0);
  });

  it('should reset equalizer to defaults', () => {
    useSettingsStore.getState().setEqBandGain(4, 7);
    useSettingsStore.getState().setEqPreamp(5);
    useSettingsStore.getState().setEqOutput(0.5);
    useSettingsStore.getState().setEqBypass(true);
    useSettingsStore.getState().resetEq();

    const eq = useSettingsStore.getState().equalizer;
    expect(eq.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(eq.preampDb).toBe(0);
    expect(eq.output).toBe(1);
    expect(eq.bypass).toBe(false);
  });
});
