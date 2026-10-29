import type { MediaAssetKind, MediaAssetRecord } from '@/src/shared/types/assets';
import type { DatabaseStats } from '@/src/shared/types/database';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryTree } from '@/src/shared/types/directories';
import type { FavoriteRecord } from '@/src/shared/types/favorites';
import type { EnqueueJob, JobListFilters, JobRecord, JobStats, JobStatus } from '@/src/shared/types/job';
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

export interface ApiEnv {
  passwordStrict: boolean;
  editorAdminOnly: boolean;
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

export interface ApiRequestOptions extends RequestInit {
  query?: object;
}

export interface ApiContextValue {
  user: ApiSession[ 'user' ] | null;
  token: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  request: < T > ( path: string, options?: ApiRequestOptions ) => Promise< T >;
  login: ( credentials: ApiLogin ) => Promise< void >;
  logout: () => Promise< void >;
  refreshSession: () => Promise< void >;
  clearError: () => void;
  health: () => Promise< ApiHealth >;
  media: {
    list: ( options?: MediaListOptions ) => Promise< MediaRecord[] >;
    get: ( id: string ) => Promise< MediaRecord | null >;
    metadata: ( id: string ) => Promise< MediaMetadataRecord[] >;
    setMetadata: ( id: string, key: string, value: string ) => Promise< MediaMetadataRecord | null >;
    deleteMetadata: ( id: string, key: string ) => Promise< void >;
    tags: ( id: string ) => Promise< TagRecord[] >;
    setTags: ( id: string, tagIds: string[] ) => Promise< TagRecord[] >;
    categories: ( id: string ) => Promise< CategoryRecord[] >;
    setCategories: ( id: string, categoryIds: string[] ) => Promise< CategoryRecord[] >;
  };
  search: ( options: MediaSearchOptions ) => Promise< MediaSearchResult >;
  roots: {
    list: () => Promise< MediaRoot[] >;
    scan: ( id: string ) => Promise< ApiRootScanResult >;
    scanAll: () => Promise< ApiRootScanAllResult >;
  };
  directories: {
    tree: ( rootId: string ) => Promise< ApiDirectoryTreeResult >;
    list: ( rootId: string, directoryId?: string | null, page?: Partial< ApiPage > ) => Promise< ApiDirectoryListResult >;
  };
  assets: {
    list: ( mediaId: string ) => Promise< ApiAssetRecord[] >;
    url: ( mediaId: string, kind: MediaAssetKind, variant?: string ) => string;
  };
  stream: ( id: string, options?: ApiStreamOptions ) => Promise< Response >;
  tags: {
    list: () => Promise< TagRecord[] >;
    get: ( id: string ) => Promise< TagRecord | null >;
    create: ( name: string ) => Promise< TagRecord | null >;
    rename: ( id: string, name: string ) => Promise< TagRecord | null >;
    delete: ( id: string ) => Promise< void >;
  };
  categories: {
    list: () => Promise< CategoryRecord[] >;
    get: ( id: string ) => Promise< CategoryRecord | null >;
    create: ( name: string, parentId?: string | null ) => Promise< CategoryRecord | null >;
    rename: ( id: string, name: string ) => Promise< CategoryRecord | null >;
    setParent: ( id: string, parentId: string | null ) => Promise< CategoryRecord | null >;
    delete: ( id: string ) => Promise< void >;
  };
  favorites: {
    list: ( page?: Partial< ApiPage > ) => Promise< FavoriteRecord[] >;
    has: ( mediaId: string ) => Promise< ApiFavorite >;
    add: ( mediaId: string ) => Promise< ApiFavoriteAddResult >;
    remove: ( mediaId: string ) => Promise< void >;
  };
  markers: {
    list: ( page?: Partial< ApiPage > ) => Promise< MarkerRecord[] >;
    get: ( id: string ) => Promise< MarkerRecord | null >;
    update: ( id: string, data: MarkerUpdate ) => Promise< MarkerRecord | null >;
    delete: ( id: string ) => Promise< void >;
    forMedia: ( id: string, page?: Partial< ApiPage > ) => Promise< MarkerRecord[] >;
    createForMedia: ( id: string, data: ApiMarkerCreate ) => Promise< Pick< MarkerRecord, 'id' > >;
    clearForMedia: ( id: string ) => Promise< ApiMarkerClearResult >;
  };
  playlists: {
    list: ( page?: Partial< ApiPage > ) => Promise< PlaylistRecord[] >;
    get: ( id: string ) => Promise< PlaylistRecord | null >;
    create: ( name: string, description?: string ) => Promise< PlaylistRecord | null >;
    update: ( id: string, data: PlaylistUpdate ) => Promise< PlaylistRecord | null >;
    delete: ( id: string ) => Promise< void >;
    items: ( id: string, page?: Partial< ApiPage > ) => Promise< PlaylistItemRecord[] >;
    add: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord[] >;
    remove: ( id: string, mediaId: string ) => Promise< void >;
    clear: ( id: string ) => Promise< ApiPlaylistClearResult >;
    move: ( id: string, mediaId: string, position: number ) => Promise< PlaylistItemRecord[] >;
    contains: ( id: string, mediaId: string ) => Promise< ApiPlaylistContainsResult >;
    forMedia: ( mediaId: string, page?: Partial< ApiPage > ) => Promise< PlaylistRecord[] >;
    next: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord | null >;
    previous: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord | null >;
  };
  prefs: {
    all: () => Promise< ApiPreferences >;
    get: < K extends PrefName > ( key: K ) => Promise< ApiPreference< PrefValue< K > > >;
    set: < K extends PrefName > ( key: K, value: PrefValue< K > ) => Promise< ApiPreference< PrefValue< K > > >;
    reset: ( key: PrefName ) => Promise< ApiDeleteResult >;
    resetAll: () => Promise< ApiDeleteResult >;
  };
  jobs: {
    list: ( filters?: ApiJobListOptions ) => Promise< JobRecord[] >;
    get: ( id: string ) => Promise< JobRecord | null >;
    stats: () => Promise< JobStats >;
    enqueue: ( data: EnqueueJob ) => Promise< ApiEnqueueResult >;
  };
  database: {
    stats: () => Promise< DatabaseStats >;
  };
}
