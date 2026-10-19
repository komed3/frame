export interface MediaRoot {
  id: number;
  path: string;
  enabled: boolean;
  scanGeneration: number;
  scannedAt: string | null;
  createdAt: string;
}

export interface MediaRootRow {
  id: number;
  path: string;
  enabled: number;
  scanGeneration: number;
  scannedAt: string | null;
  createdAt: string;
}
