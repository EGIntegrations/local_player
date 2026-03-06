import { create } from 'zustand';
import { Settings } from '../types/settings';

interface SettingsState extends Settings {
  setMonitoredFolder: (folder: string) => void;
  setS3Configured: (configured: boolean) => void;
  setDriveConfigured: (configured: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  monitoredFolder: null,
  s3Configured: false,
  driveConfigured: false,
  theme: 'dark',

  setMonitoredFolder: (folder) => set({ monitoredFolder: folder }),
  setS3Configured: (configured) => set({ s3Configured: configured }),
  setDriveConfigured: (configured) => set({ driveConfigured: configured }),
  setTheme: (theme) => set({ theme }),
}));
