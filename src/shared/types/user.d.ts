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
  is_admin: 0 | 1;
  created_at: string;
  disabled_at: string | null;
}

/** Add known preference keys and their value types here as requirements emerge. */
export interface UserPreferenceMap {}

export type UserPreferenceValue< K extends string > =
  K extends keyof UserPreferenceMap ? UserPreferenceMap[ K ] : unknown;

export interface UserPreferenceRecord< K extends string = string > {
  key: K;
  value: UserPreferenceValue< K >;
  updatedAt: string;
}

export interface UserPreferenceRow {
  key: string;
  value_json: string;
  updated_at: string;
}
