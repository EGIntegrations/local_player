import { SearchBar } from './SearchBar';
import { SourceFilter } from './SourceFilter';
import { TrackList } from './TrackList';

export function Library() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <SearchBar />
        <SourceFilter />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-cosmic-light-teal/20 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold font-mono">Library</h2>
        </div>
        <TrackList />
      </div>
    </div>
  );
}
