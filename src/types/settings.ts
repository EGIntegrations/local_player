export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface EqualizerState {
  bands: number[]; // 10-band gains in dB
  preampDb: number;
  output: number;
  bypass: boolean;
}

export interface Settings {
  monitoredFolder: string | null;
  s3Configured: boolean;
  driveConfigured: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  equalizer: EqualizerState;
}

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  prefix?: string;
}
