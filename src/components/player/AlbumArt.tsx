interface AlbumArtProps {
  url: string | null;
  album: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-24 h-24',
  lg: 'w-48 h-48',
};

export function AlbumArt({ url, album, size = 'lg' }: AlbumArtProps) {
  return (
    <div
      className={`${sizeClasses[size]} bg-cosmic-teal rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0`}
    >
      {url ? (
        <img
          src={url}
          alt={album || 'Album art'}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg
          className="w-1/2 h-1/2 text-cosmic-light-teal"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      )}
    </div>
  );
}
