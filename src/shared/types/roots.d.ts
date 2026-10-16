export interface MediaRoot {
  id: number;
  path: string;
  enabled: boolean;
  scannedAt: string | null;
  createdAt: string;
}

export interface MediaRootRow {
  id: number;
  path: string;
  enabled: number;
  scannedAt: string | null;
  createdAt: string;
}
