export interface ActiveSessionRow {
  id: number;
  userId: number;
  username: string;
  isAdmin: number;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string | null;
}

export interface ActiveSession extends Omit< ActiveSessionRow, 'isAdmin' > {
  isAdmin: boolean;
}
