import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { FolderSelection } from './FolderSelection';

interface SettingsProps {
  onFolderSelected: (path: string) => Promise<void> | void;
  onFilesSelected: (paths: string[]) => Promise<void> | void;
}

export function Settings({ onFolderSelected, onFilesSelected }: SettingsProps) {
  const settingsVisible = useUIStore((s) => s.settingsVisible);
  const setSettingsVisible = useUIStore((s) => s.setSettingsVisible);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  if (!settingsVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="panel mx-4 w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="panel-title text-2xl font-bold font-mono">Settings</h2>
          <button
            onClick={() => setSettingsVisible(false)}
            className="terminal-btn px-2 py-2"
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
            <h3 className="panel-title mb-3 text-lg font-semibold">Theme</h3>
            <div className="theme-segmented">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`theme-segmented-btn ${themeMode === mode ? 'theme-segmented-btn-active' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-cosmic-light-teal/65">
              Active theme: {resolvedTheme}
            </p>
          </section>

          <section>
            <h3 className="panel-title mb-4 text-lg font-semibold">Local Library</h3>
            <FolderSelection onFolderSelected={onFolderSelected} onFilesSelected={onFilesSelected} />
            <p className="mt-3 text-sm text-cosmic-light-teal/60">
              You can monitor a whole folder or import selected MP3 files directly.
            </p>
          </section>

          <section>
            <h3 className="panel-title mb-4 text-lg font-semibold">Cloud Sources</h3>
            <p className="text-sm text-cosmic-light-teal/60">
              Cloud integration (S3, Google Drive) coming soon...
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
