import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../../stores/settingsStore';

interface FolderSelectionProps {
  onFolderSelected: (path: string) => void;
}

export function FolderSelection({ onFolderSelected }: FolderSelectionProps) {
  const monitoredFolder = useSettingsStore((s) => s.monitoredFolder);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelect = async () => {
    setIsSelecting(true);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select music folder' });
      if (selected && typeof selected === 'string') {
        onFolderSelected(selected);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Music Folder
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={monitoredFolder || 'No folder selected'}
          disabled
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
        />
        <button
          onClick={handleSelect}
          disabled={isSelecting}
          className="px-4 py-2 bg-cosmic-orange hover:bg-cosmic-apricot disabled:bg-gray-600 rounded-lg transition-colors text-white"
        >
          {isSelecting ? 'Selecting...' : 'Browse'}
        </button>
      </div>
      {monitoredFolder && (
        <p className="text-sm text-gray-400">
          Monitoring this folder for MP3 files.
        </p>
      )}
    </div>
  );
}
