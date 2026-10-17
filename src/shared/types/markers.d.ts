export interface MarkerRecord {
  id: number;
  userId: number;
  mediaId: number;
  positionMs: number;
  title: string | null;
  description: string | null;
  createdAt: string;
}

export interface MarkerUpdate {
  positionMs?: number;
  title?: string | null;
  description?: string | null;
}
