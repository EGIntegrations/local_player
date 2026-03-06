export interface Settings {
  monitoredFolder: string | null;
  s3Configured: boolean;
  driveConfigured: boolean;
  theme: 'dark' | 'light';
}

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  prefix?: string;
}
