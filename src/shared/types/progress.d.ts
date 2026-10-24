export interface ProgressRecord {
  userId: string;
  mediaId: string;
  positionMs: number;
  completed: boolean;
  updatedAt: string;
}

export interface ProgressRow extends Omit< ProgressRecord, 'completed' > {
  completed: number;
}
