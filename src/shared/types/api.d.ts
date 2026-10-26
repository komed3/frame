import type { DatabaseStats } from '@/src/shared/types/database';
import type { MediaAssetRecord, MediaAssetKind } from '@/src/shared/types/assets';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryTree } from '@/src/shared/types/directories';
import type { FavoriteRecord } from '@/src/shared/types/favorites';
import type { JobKind, JobListFilters, JobRecord, JobStats, JobStatus } from '@/src/shared/types/job';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import type { MediaListOptions, MediaRecord } from '@/src/shared/types/media';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import type { PlaylistItemRecord, PlaylistRecord, PlaylistUpdate } from '@/src/shared/types/playlists';
import type { PrefName, PrefSchema, PrefTable, PrefValue } from '@/src/shared/types/pref';
import type { MediaRoot } from '@/src/shared/types/roots';
import type { MediaSearchOptions, MediaSearchResult } from '@/src/shared/types/search';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
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
  schema: PrefTable;
  values: PrefSchema;
}

export interface ApiDeleteResult {
  deleted: number | boolean;
}

export interface ApiFavorite {
  favorite: boolean;
}

export interface ApiFavoriteAddResult extends ApiFavorite {
  added: boolean;
}

export interface ApiStreamOptions {
  range?: string;
  signal?: AbortSignal;
}

export interface ApiRootScanResult {
  jobId: string;
}

export interface ApiRootScanAllResult {
  message: string;
}

export interface ApiDirectoryTreeResult {
  root: {
    id?: string;
    name?: string;
  };
  tree: MediaDirectoryTree[];
}

export interface ApiDirectoryListResult {
  root: {
    id: string;
    name?: string;
  };
  current: MediaDirectory | null;
  breadcrumbs: Pick< MediaDirectory, 'id' | 'name' | 'path' >[];
  directories: MediaDirectoryEntry[];
  media: MediaRecord[];
  limit: number;
  offset: number;
}

export type ApiAssetRecord = Omit< MediaAssetRecord, 'path' > & {
  url: string;
};

export interface ApiMarkerCreate {
  positionMs: number;
  title?: string;
  description?: string;
}

export interface ApiMarkerClearResult {
  deleted: number;
}

export interface ApiPlaylistClearResult {
  deleted: number;
}

export interface ApiPlaylistContainsResult {
  inPlaylist: boolean;
}

export interface ApiJobListOptions extends JobListFilters, Partial< ApiPage > {
  status?: JobStatus;
}

export interface ApiEnqueueResult {
  job: JobRecord | null;
}

export type ApiClientQuery = object;
