export interface PlayRecord {
  id: string;
  userId: string;
  mediaId: string;
  sessionId: string | null;
  startedAt: string;
  endedAt: string | null;
  watchedMs: number;
  completed: boolean;
}

export interface PlayRow extends Omit< PlayRecord, 'completed' > {
  completed: number;
}
