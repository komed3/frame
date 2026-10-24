export interface UserRecord {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  disabledAt: string | null;
}

export interface UserRow {
  id: string;
  username: string;
  pw_hash: string;
  is_admin: 0 | 1;
  created_at: string;
  disabled_at: string | null;
}
