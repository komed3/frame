export interface MarkerRecord {
  id: string;
  userId: string;
  mediaId: string;
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
