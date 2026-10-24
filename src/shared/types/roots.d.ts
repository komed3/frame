export interface MediaRoot {
  id: string;
  path: string;
  enabled: boolean;
  scanGeneration: number;
  scannedAt: string | null;
  createdAt: string;
}

export interface MediaRootRow {
  id: string;
  path: string;
  enabled: number;
  scanGeneration: number;
  scannedAt: string | null;
  createdAt: string;
}
