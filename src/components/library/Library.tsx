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

      <div className="panel overflow-hidden">
        <div className="border-b border-cosmic-light-teal/20 p-4">
          <h2 className="panel-title text-xl font-mono">Library</h2>
        </div>
        <TrackList />
      </div>
    </div>
  );
}
