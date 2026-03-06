import jsmediatags from 'jsmediatags';

export interface ID3Tags {
  title: string;
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
          title: tags.title || 'Unknown',
          artist: tags.artist || null,
          album: tags.album || null,
          year: tags.year ? parseInt(String(tags.year), 10) : null,
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
