export interface MediaDirectory {
  id: number;
  rootId: number;
  parentId: number | null;
  path: string;
  name: string;
  scannedAt: string;
  createdAt: string;
}

export interface MediaDirectoryEntry extends MediaDirectory {
  mediaCount: number;
}

export interface MediaDirectoryRow extends MediaDirectory {
  scanGeneration: number;
}
