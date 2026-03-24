PRAGMA foreign_keys=OFF;
BEGIN;

ALTER TABLE tracks ADD COLUMN file_path_key TEXT;
ALTER TABLE tracks ADD COLUMN library_scope_id TEXT NOT NULL DEFAULT 'legacy';

UPDATE tracks
SET file_path_key = lower(replace(file_path, '\\', '/'))
WHERE file_path_key IS NULL OR trim(file_path_key) = '';

CREATE TEMP TABLE _track_keep AS
SELECT file_path_key, MIN(id) AS keep_id
FROM tracks
WHERE file_path_key IS NOT NULL AND trim(file_path_key) <> ''
GROUP BY file_path_key;

UPDATE playlist_tracks
SET track_id = (
  SELECT k.keep_id
  FROM tracks t
  JOIN _track_keep k ON k.file_path_key = t.file_path_key
  WHERE t.id = playlist_tracks.track_id
)
WHERE track_id IN (
  SELECT t.id
  FROM tracks t
  JOIN _track_keep k ON k.file_path_key = t.file_path_key
  WHERE t.id <> k.keep_id
);

DELETE FROM tracks
WHERE id IN (
  SELECT t.id
  FROM tracks t
  JOIN _track_keep k ON k.file_path_key = t.file_path_key
  WHERE t.id <> k.keep_id
);

DROP TABLE _track_keep;

CREATE INDEX IF NOT EXISTS idx_tracks_scope ON tracks(library_scope_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_file_path_key_unique ON tracks(file_path_key);

COMMIT;
PRAGMA foreign_keys=ON;
