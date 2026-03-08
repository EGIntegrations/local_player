import { create } from 'zustand';
import { EqualizerState, ResolvedTheme, Settings, ThemeMode } from '../types/settings';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DEFAULT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const DEFAULT_EQ: EqualizerState = {
  bands: [...DEFAULT_BANDS],
  preampDb: 0,
  output: 1,
  bypass: false,
};

function normalizeEqState(partial: Partial<EqualizerState> | null | undefined): EqualizerState {
  const bandSource = Array.isArray(partial?.bands) ? partial?.bands : DEFAULT_BANDS;
  const bands = [...DEFAULT_BANDS];
  for (let i = 0; i < bands.length; i += 1) {
    bands[i] = clamp(Number(bandSource[i] ?? 0), -12, 12);
  }
  return {
    bands,
    preampDb: clamp(Number(partial?.preampDb ?? DEFAULT_EQ.preampDb), -12, 12),
    output: clamp(Number(partial?.output ?? DEFAULT_EQ.output), 0, 1),
    bypass: Boolean(partial?.bypass ?? DEFAULT_EQ.bypass),
  };
}

interface SettingsState extends Settings {
  setMonitoredFolder: (folder: string) => void;
  setS3Configured: (configured: boolean) => void;
  setDriveConfigured: (configured: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  syncResolvedTheme: (prefersDark: boolean) => void;
  setEqState: (eq: Partial<EqualizerState>) => void;
  setEqBandGain: (index: number, gainDb: number) => void;
  setEqPreamp: (gainDb: number) => void;
  setEqOutput: (output: number) => void;
  setEqBypass: (enabled: boolean) => void;
  resetEq: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  monitoredFolder: null,
  s3Configured: false,
  driveConfigured: false,
  themeMode: 'system',
  resolvedTheme: 'light',
  equalizer: { ...DEFAULT_EQ, bands: [...DEFAULT_EQ.bands] },

  setMonitoredFolder: (folder) => set({ monitoredFolder: folder }),
  setS3Configured: (configured) => set({ s3Configured: configured }),
  setDriveConfigured: (configured) => set({ driveConfigured: configured }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
  syncResolvedTheme: (prefersDark) =>
    set((state) => ({
      resolvedTheme: state.themeMode === 'system'
        ? (prefersDark ? 'dark' : 'light')
        : state.themeMode,
    })),
  setEqState: (eq) => set((state) => ({ equalizer: normalizeEqState({ ...state.equalizer, ...eq }) })),
  setEqBandGain: (index, gainDb) =>
    set((state) => {
      if (index < 0 || index >= state.equalizer.bands.length) return state;
      const bands = [...state.equalizer.bands];
      bands[index] = clamp(gainDb, -12, 12);
      return { equalizer: normalizeEqState({ ...state.equalizer, bands }) };
    }),
  setEqPreamp: (gainDb) =>
    set((state) => ({ equalizer: normalizeEqState({ ...state.equalizer, preampDb: gainDb }) })),
  setEqOutput: (output) =>
    set((state) => ({ equalizer: normalizeEqState({ ...state.equalizer, output }) })),
  setEqBypass: (enabled) =>
    set((state) => ({ equalizer: normalizeEqState({ ...state.equalizer, bypass: enabled }) })),
  resetEq: () =>
    set(() => ({ equalizer: { ...DEFAULT_EQ, bands: [...DEFAULT_EQ.bands] } })),
}));

export const settingsDefaults = {
  equalizer: { ...DEFAULT_EQ, bands: [...DEFAULT_EQ.bands] },
  getResolvedTheme: (mode: ThemeMode, prefersDark: boolean): ResolvedTheme =>
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode,
};
