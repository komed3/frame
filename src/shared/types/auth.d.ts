import type { UserRecord } from '@/src/shared/types/user';


export interface SessionRow {
  id: number;
  user_id: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: UserRecord;
}

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
