export interface Playlist {
  id: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistTrack {
  id: number;
  playlistId: number;
  trackId: number;
  position: number;
  createdAt: number;
}
