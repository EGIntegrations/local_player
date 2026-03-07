import { useLibraryStore } from '../../stores/libraryStore';

const filters = [
  { value: 'all' as const, label: 'All' },
  { value: 'local' as const, label: 'Local' },
  { value: 's3' as const, label: 'S3' },
  { value: 'drive' as const, label: 'Drive' },
];

export function SourceFilter() {
  const sourceFilter = useLibraryStore((s) => s.sourceFilter);
  const setSourceFilter = useLibraryStore((s) => s.setSourceFilter);

  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => setSourceFilter(f.value)}
          className={`terminal-tab px-4 py-2 transition-colors ${
            sourceFilter === f.value
              ? 'terminal-tab-active'
              : ''
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
