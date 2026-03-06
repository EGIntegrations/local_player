import { invoke } from '@tauri-apps/api/core';

export async function scanFolder(folderPath: string): Promise<string[]> {
  return invoke<string[]>('scan_folder', { folderPath });
}

export async function startWatchingFolder(folderPath: string): Promise<void> {
  await invoke('start_watching_folder', { folderPath });
}

export async function readFileBytes(filePath: string): Promise<number[]> {
  return invoke<number[]>('read_file_bytes', { filePath });
}
