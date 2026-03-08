import { create } from 'zustand';
import { EqualizerState, ResolvedTheme, Settings, ThemeMode, VisualizerColors } from '../types/settings';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DEFAULT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const DEFAULT_VIS_COLORS: VisualizerColors = {
  waveform: '#8cb6f5',
  vu: '#f0b078',
};

const DEFAULT_EQ: EqualizerState = {
  bands: [...DEFAULT_BANDS],
  preampDb: 0,
  output: 1,
  bypass: false,
};

function normalizeColorHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized;
  return fallback;
}

function normalizeVisualizerColors(partial: Partial<VisualizerColors> | null | undefined): VisualizerColors {
  return {
    waveform: normalizeColorHex(partial?.waveform, DEFAULT_VIS_COLORS.waveform),
    vu: normalizeColorHex(partial?.vu, DEFAULT_VIS_COLORS.vu),
  };
}

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
  setVisualizerColors: (colors: Partial<VisualizerColors>) => void;
  setWaveformColor: (color: string) => void;
  setVuColor: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  monitoredFolder: null,
  s3Configured: false,
  driveConfigured: false,
  themeMode: 'system',
  resolvedTheme: 'light',
  equalizer: { ...DEFAULT_EQ, bands: [...DEFAULT_EQ.bands] },
  visualizerColors: { ...DEFAULT_VIS_COLORS },

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
  setVisualizerColors: (colors) =>
    set((state) => ({
      visualizerColors: normalizeVisualizerColors({ ...state.visualizerColors, ...colors }),
    })),
  setWaveformColor: (color) =>
    set((state) => ({
      visualizerColors: normalizeVisualizerColors({ ...state.visualizerColors, waveform: color }),
    })),
  setVuColor: (color) =>
    set((state) => ({
      visualizerColors: normalizeVisualizerColors({ ...state.visualizerColors, vu: color }),
    })),
}));

export const settingsDefaults = {
  equalizer: { ...DEFAULT_EQ, bands: [...DEFAULT_EQ.bands] },
  visualizerColors: { ...DEFAULT_VIS_COLORS },
  getResolvedTheme: (mode: ThemeMode, prefersDark: boolean): ResolvedTheme =>
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode,
};
