import jsmediatags from 'jsmediatags/build2/jsmediatags.js';

export interface ID3Tags {
  title: string | null;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  albumArt: string | null;
}

export function parseID3Tags(arrayBuffer: ArrayBuffer): Promise<ID3Tags> {
  return new Promise((resolve, reject) => {
    jsmediatags.read(new Blob([arrayBuffer]), {
      onSuccess(tag) {
        const tags = tag.tags;
        const parsedYear = tags.year ? parseInt(String(tags.year), 10) : NaN;

        let albumArt: string | null = null;
        if (tags.picture) {
          const { data, format } = tags.picture;
          const bytes = new Uint8Array(data);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          albumArt = `data:${format};base64,${btoa(binary)}`;
        }

        resolve({
          title: tags.title ? String(tags.title).trim() : null,
          artist: tags.artist || null,
          album: tags.album || null,
          year: Number.isFinite(parsedYear) ? parsedYear : null,
          genre: tags.genre || null,
          albumArt,
        });
      },
      onError(error) {
        reject(error);
      },
    });
  });
}
