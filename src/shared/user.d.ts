export type UserRecord = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  disabledAt: string | null;
};

export type UserRow = {
  id: number;
  username: string;
  pw_hash: string;
  is_admin: number;
  created_at: string;
  disabled_at: string | null;
};

export type SessionRow = {
  id: number;
  user_id: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
};

export type AuthResult = {
  token: string;
  expiresAt: string;
  user: UserRecord;
};
