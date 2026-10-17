export interface PlayRecord {
  id: number;
  userId: number;
  mediaId: number;
  sessionId: number | null;
  startedAt: string;
  endedAt: string | null;
  watchedMs: number;
  completed: boolean;
}

export interface PlayRow extends Omit< PlayRecord, 'completed' > {
  completed: number;
}
