export interface Track {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  duration: number; // seconds
  filePath: string;
  source: 'local' | 's3' | 'drive';
  albumArtUrl: string | null;
  createdAt: number;
  updatedAt: number;
}
