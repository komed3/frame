export interface MediaDirectory {
  id: string;
  rootId: string;
  parentId: string | null;
  path: string;
  name: string;
  scannedAt: string;
  createdAt: string;
}

export interface MediaDirectoryEntry extends MediaDirectory {
  mediaCount: number;
}

export interface MediaDirectoryTree extends MediaDirectoryEntry {
  children: MediaDirectoryTree[];
}

export interface MediaDirectoryRow extends MediaDirectory {
  scanGeneration: number;
}
