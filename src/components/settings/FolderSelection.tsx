import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../../stores/settingsStore';

interface FolderSelectionProps {
  onFolderSelected: (path: string) => Promise<void> | void;
  onFilesSelected: (paths: string[]) => Promise<void> | void;
}

function normalizeDialogResult(selected: string | string[] | null): string[] {
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export function FolderSelection({ onFolderSelected, onFilesSelected }: FolderSelectionProps) {
  const monitoredFolder = useSettingsStore((s) => s.monitoredFolder);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSelectingFiles, setIsSelectingFiles] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select music folder' });
      const normalized = normalizeDialogResult(selected);
      if (normalized.length > 0) {
        await onFolderSelected(normalized[0]);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleSelectFiles = async () => {
    setIsSelectingFiles(true);
    try {
      const selected = await open({
        directory: false,
        multiple: true,
        title: 'Select MP3 files',
        filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }],
      });
      const normalized = normalizeDialogResult(selected);
      if (normalized.length > 0) {
        await onFilesSelected(normalized);
      }
    } catch (err) {
      console.error('Error selecting files:', err);
    } finally {
      setIsSelectingFiles(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="soft-label block mb-2 font-medium">
        Music Folder
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={monitoredFolder || 'No folder selected'}
          disabled
          className="terminal-input flex-1 px-3 py-2 text-cosmic-light-teal/70"
        />
        <button
          onClick={handleSelectFolder}
          disabled={isSelecting}
          className="terminal-btn px-4 py-2"
        >
          {isSelecting ? 'Selecting...' : 'Browse Folder'}
        </button>
        <button
          onClick={handleSelectFiles}
          disabled={isSelectingFiles}
          className="terminal-btn terminal-btn-primary px-4 py-2"
        >
          {isSelectingFiles ? 'Adding...' : 'Add Files'}
        </button>
      </div>
      {monitoredFolder && (
        <p className="text-sm text-cosmic-light-teal/60">
          Monitoring this folder for MP3 files.
        </p>
      )}
    </div>
  );
}
