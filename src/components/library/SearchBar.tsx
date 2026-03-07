import { useState, useEffect } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query, setSearchQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Query library..."
        className="terminal-input w-full px-4 py-2 pl-10"
      />
      <svg
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cosmic-light-teal/60"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
