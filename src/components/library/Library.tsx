import { SearchBar } from './SearchBar';
import { SourceFilter } from './SourceFilter';
import { TrackList } from './TrackList';

interface LibraryProps {
  onCleanDuplicates: () => void;
  isCleaning: boolean;
}

export function Library({ onCleanDuplicates, isCleaning }: LibraryProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <SearchBar />
        <SourceFilter />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-cosmic-light-teal/20 p-4">
          <h2 className="panel-title text-xl font-mono">Library</h2>
          <button
            onClick={onCleanDuplicates}
            className="terminal-btn px-3 py-2 text-xs"
            disabled={isCleaning}
          >
            {isCleaning ? 'Cleaning...' : 'Clean Duplicates'}
          </button>
        </div>
        <TrackList />
      </div>
    </div>
  );
}
