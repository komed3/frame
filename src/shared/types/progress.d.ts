export interface ProgressRecord {
  userId: number;
  mediaId: number;
  positionMs: number;
  completed: boolean;
  updatedAt: string;
}

export interface ProgressRow extends Omit< ProgressRecord, 'completed' > {
  completed: number;
}
