import { useUIStore } from '../../stores/uiStore';
import { FolderSelection } from './FolderSelection';

interface SettingsProps {
  onFolderSelected: (path: string) => void;
}

export function Settings({ onFolderSelected }: SettingsProps) {
  const settingsVisible = useUIStore((s) => s.settingsVisible);
  const setSettingsVisible = useUIStore((s) => s.setSettingsVisible);

  if (!settingsVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl border border-cosmic-light-teal/20 p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-mono text-white">Settings</h2>
          <button
            onClick={() => setSettingsVisible(false)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Local Library</h3>
            <FolderSelection onFolderSelected={onFolderSelected} />
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Cloud Sources</h3>
            <p className="text-gray-400 text-sm">
              Cloud integration (S3, Google Drive) coming soon...
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
