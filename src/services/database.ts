import Database from '@tauri-apps/plugin-sql';
import { Track } from '../types/track';
import { Playlist } from '../types/playlist';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:local_player.db');
  }
  return db;
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function toPathKey(filePath: string): string {
  return normalizeFilePath(filePath).trim().toLowerCase();
}

// --- Tracks ---

export async function getAllTracks(): Promise<Track[]> {
  const conn = await getDb();
  const rows = await conn.select<Track[]>(
    'SELECT id, title, artist, album, year, genre, duration, file_path as filePath, source, album_art_url as albumArtUrl, created_at as createdAt, updated_at as updatedAt FROM tracks ORDER BY title'
  );
  return rows;
}

export async function getTracksByScope(scopeId: string): Promise<Track[]> {
  const conn = await getDb();
  const rows = await conn.select<Track[]>(
    `SELECT id, title, artist, album, year, genre, duration,
            file_path as filePath, source, album_art_url as albumArtUrl,
            created_at as createdAt, updated_at as updatedAt
     FROM tracks
     WHERE library_scope_id = ?
     ORDER BY title`,
    [scopeId]
  );
  return rows;
}

export async function addTrack(params: {
  title: string;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  duration: number | null;
  filePath: string;
  libraryScopeId: string;
  source: 'local' | 's3' | 'drive';
  albumArtUrl: string | null;
}): Promise<number> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const normalizedPath = normalizeFilePath(params.filePath);
  const pathKey = toPathKey(normalizedPath);

  const existingByKey = await conn.select<{ id: number }[]>(
    'SELECT id FROM tracks WHERE file_path_key = ? LIMIT 1',
    [pathKey]
  );
  if (existingByKey.length > 0) {
    const existingId = existingByKey[0].id;
    await conn.execute(
      `UPDATE tracks
       SET title = ?, artist = ?, album = ?, year = ?, genre = ?, duration = ?,
           file_path = ?, file_path_key = ?, library_scope_id = ?, source = ?, album_art_url = ?, updated_at = ?
       WHERE id = ?`,
      [
        params.title,
        params.artist,
        params.album,
        params.year,
        params.genre,
        params.duration,
        normalizedPath,
        pathKey,
        params.libraryScopeId,
        params.source,
        params.albumArtUrl,
        now,
        existingId,
      ]
    );
    return existingId;
  }

  const result = await conn.execute(
    `INSERT INTO tracks
       (title, artist, album, year, genre, duration, file_path, file_path_key, library_scope_id, source, album_art_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.title,
      params.artist,
      params.album,
      params.year,
      params.genre,
      params.duration,
      normalizedPath,
      pathKey,
      params.libraryScopeId,
      params.source,
      params.albumArtUrl,
      now,
      now,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function deleteTrack(trackId: number): Promise<void> {
  const conn = await getDb();
  await conn.execute('DELETE FROM tracks WHERE id = ?', [trackId]);
}

export async function updateTrackMetadata(
  trackId: number,
  params: { title: string; artist: string | null }
): Promise<void> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await conn.execute(
    'UPDATE tracks SET title = ?, artist = ?, updated_at = ? WHERE id = ?',
    [params.title, params.artist, now, trackId]
  );
}

export async function updateTrackFilePath(trackId: number, filePath: string): Promise<void> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const normalizedPath = normalizeFilePath(filePath);
  const pathKey = toPathKey(normalizedPath);
  await conn.execute(
    'UPDATE tracks SET file_path = ?, file_path_key = ?, updated_at = ? WHERE id = ?',
    [normalizedPath, pathKey, now, trackId]
  );
}

export async function getTrackByFilePath(filePath: string): Promise<Track | null> {
  const conn = await getDb();
  const normalizedPath = normalizeFilePath(filePath);
  const pathKey = toPathKey(normalizedPath);
  const rows = await conn.select<Track[]>(
    `SELECT id, title, artist, album, year, genre, duration,
            file_path as filePath, source, album_art_url as albumArtUrl,
            created_at as createdAt, updated_at as updatedAt
     FROM tracks
     WHERE file_path = ? OR file_path_key = ?
     LIMIT 1`,
    [normalizedPath, pathKey]
  );
  return rows.length > 0 ? rows[0] : null;
}

// --- Playlists ---

export async function getAllPlaylists(): Promise<Playlist[]> {
  const conn = await getDb();
  return conn.select<Playlist[]>(
    'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM playlists ORDER BY name'
  );
}

export async function createPlaylist(name: string): Promise<number> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = await conn.execute(
    'INSERT INTO playlists (name, created_at, updated_at) VALUES (?, ?, ?)',
    [name, now, now]
  );
  return result.lastInsertId ?? 0;
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  const conn = await getDb();
  await conn.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);
}

export async function getPlaylistTracks(playlistId: number): Promise<Track[]> {
  const conn = await getDb();
  return conn.select<Track[]>(
    `SELECT t.id, t.title, t.artist, t.album, t.year, t.genre, t.duration,
            t.file_path as filePath, t.source, t.album_art_url as albumArtUrl,
            t.created_at as createdAt, t.updated_at as updatedAt
     FROM tracks t
     JOIN playlist_tracks pt ON t.id = pt.track_id
     WHERE pt.playlist_id = ?
     ORDER BY pt.position`,
    [playlistId]
  );
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number,
  position: number
): Promise<void> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await conn.execute(
    'INSERT INTO playlist_tracks (playlist_id, track_id, position, created_at) VALUES (?, ?, ?, ?)',
    [playlistId, trackId, position, now]
  );
}

export async function removeTrackFromPlaylist(
  playlistId: number,
  trackId: number
): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
    [playlistId, trackId]
  );
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const conn = await getDb();
  const rows = await conn.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await conn.execute(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
    [key, value, now]
  );
}
