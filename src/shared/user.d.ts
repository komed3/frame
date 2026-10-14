export interface UserRecord {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  disabledAt: string | null;
}

export interface UserRow {
  id: number;
  username: string;
  pw_hash: string;
  is_admin: number;
  created_at: string;
  disabled_at: string | null;
}

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
