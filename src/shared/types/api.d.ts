import type { UserRecord } from '@/src/shared/types/user';


export interface ApiError {
  error: string;
}

export interface ApiHealth {
  status: 'ok';
}

export interface ApiSession {
  user: UserRecord;
}

export interface ApiLogin {
  username: string;
  password: string;
}

export interface ApiLoginResult {
  token: string;
  expiresAt: string;
  user: UserRecord;
}

export interface ApiPage {
  limit: number;
  offset: number;
}

export interface ApiPreference< T = unknown > {
  key: string;
  value: T;
}

export interface ApiPreferences {
  schema: Record< string, unknown >;
  values: Record< string, unknown >;
}

export interface ApiDeleteResult {
  deleted: number | boolean;
}

export interface ApiFavorite {
  favorite: boolean;
}

export interface ApiJobStats {
  [ key: string ]: number;
}

export interface ApiStreamOptions {
  range?: string;
  signal?: AbortSignal;
}
