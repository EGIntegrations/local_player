export interface ID3Tags {
  title: string | null;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  albumArt: string | null;
}

function readSynchsafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function decodeText(encoding: number, bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  try {
    if (encoding === 1) return new TextDecoder('utf-16').decode(bytes);
    if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes);
    if (encoding === 3) return new TextDecoder('utf-8').decode(bytes);
    return new TextDecoder('latin1').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function cleanText(value: string): string | null {
  const cleaned = value.replace(/\u0000/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseTextFrame(frameBytes: Uint8Array): string | null {
  if (frameBytes.length < 2) return null;
  const encoding = frameBytes[0];
  return cleanText(decodeText(encoding, frameBytes.slice(1)));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function parseApicFrame(frameBytes: Uint8Array): string | null {
  if (frameBytes.length < 5) return null;
  const encoding = frameBytes[0];

  let cursor = 1;
  while (cursor < frameBytes.length && frameBytes[cursor] !== 0x00) cursor += 1;
  const mimeType = cleanText(new TextDecoder('latin1').decode(frameBytes.slice(1, cursor))) ?? 'image/jpeg';
  cursor += 1;

  if (cursor >= frameBytes.length) return null;
  cursor += 1; // picture type byte

  if (encoding === 1 || encoding === 2) {
    while (cursor + 1 < frameBytes.length) {
      if (frameBytes[cursor] === 0x00 && frameBytes[cursor + 1] === 0x00) {
        cursor += 2;
        break;
      }
      cursor += 2;
    }
  } else {
    while (cursor < frameBytes.length && frameBytes[cursor] !== 0x00) cursor += 1;
    cursor += 1;
  }

  if (cursor >= frameBytes.length) return null;
  const imageBytes = frameBytes.slice(cursor);
  if (imageBytes.length === 0) return null;

  return `data:${mimeType};base64,${bytesToBase64(imageBytes)}`;
}

export async function parseID3Tags(arrayBuffer: ArrayBuffer): Promise<ID3Tags> {
  const bytes = new Uint8Array(arrayBuffer);
  const empty: ID3Tags = {
    title: null,
    artist: null,
    album: null,
    year: null,
    genre: null,
    albumArt: null,
  };

  if (bytes.length < 10) return empty;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return empty;

  const majorVersion = bytes[3];
  if (majorVersion < 2 || majorVersion > 4) return empty;

  const tagSize = readSynchsafeInt(bytes, 6);
  const tagEnd = Math.min(bytes.length, 10 + tagSize);
  let offset = 10;

  const tags: ID3Tags = { ...empty };

  while (offset + 10 <= tagEnd) {
    const frameId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );

    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

    const frameSize = majorVersion === 4
      ? readSynchsafeInt(bytes, offset + 4)
      : readUInt32BE(bytes, offset + 4);

    if (frameSize <= 0) break;

    const frameDataStart = offset + 10;
    const frameDataEnd = frameDataStart + frameSize;
    if (frameDataEnd > tagEnd) break;

    const frameData = bytes.slice(frameDataStart, frameDataEnd);

    if (frameId === 'TIT2') tags.title = parseTextFrame(frameData);
    if (frameId === 'TPE1') tags.artist = parseTextFrame(frameData);
    if (frameId === 'TALB') tags.album = parseTextFrame(frameData);
    if (frameId === 'TCON') tags.genre = parseTextFrame(frameData);
    if (frameId === 'TYER' || frameId === 'TDRC') {
      const rawYear = parseTextFrame(frameData);
      if (rawYear) {
        const yearMatch = rawYear.match(/\d{4}/);
        tags.year = yearMatch ? Number.parseInt(yearMatch[0], 10) : null;
      }
    }
    if (frameId === 'APIC') tags.albumArt = parseApicFrame(frameData);

    offset = frameDataEnd;
  }

  return tags;
}
