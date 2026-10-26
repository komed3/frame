import type {
  ApiHealth, ApiLogin, ApiLoginResult, ApiPage, ApiPreference, ApiPreferences,
  ApiSession, ApiStreamOptions, ApiDeleteResult, ApiFavorite
} from '@/src/shared/types/api';
import type { MediaRecord, MediaListOptions, MediaType, MediaUpdate } from '@/src/shared/types/media';
import type { MediaSearchOptions, MediaSearchResult } from '@/src/shared/types/search';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryTree } from '@/src/shared/types/directories';
import type { MediaRoot } from '@/src/shared/types/roots';
import type { TagRecord, CategoryRecord } from '@/src/shared/types/taxonomy';
import type { PlaylistRecord, PlaylistItemRecord, PlaylistUpdate } from '@/src/shared/types/playlists';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import type { MediaAssetRecord } from '@/src/shared/types/assets';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';


const API = '/api';
const TOKEN_KEY = 'frame.session';


export class ApiError extends Error {
  constructor ( message: string, public status: number ) {
    super( message );
    this.name = 'ApiError';
  }
}


interface ApiRequestOptions extends RequestInit {
  query?: Record< string, string | number | boolean | null | undefined >;
}

interface ApiContextValue {
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
    get: ( id: string ) => Promise< MediaRecord >;
    update: ( id: string, data: MediaUpdate ) => Promise< MediaRecord >;
    search: ( options: MediaSearchOptions ) => Promise< MediaSearchResult >;
    metadata: ( id: string ) => Promise< unknown[] >;
    setMetadata: ( id: string, key: string, value: unknown ) => Promise< unknown >;
    deleteMetadata: ( id: string, key: string ) => Promise< void >;
    tags: ( id: string ) => Promise< TagRecord[] >;
    setTags: ( id: string, tagIds: string[] ) => Promise< TagRecord[] >;
    categories: ( id: string ) => Promise< CategoryRecord[] >;
    setCategories: ( id: string, categoryIds: string[] ) => Promise< CategoryRecord[] >;
  };
  roots: {
    list: () => Promise< MediaRoot[] >;
    scan: ( id: string ) => Promise< { jobId: string } >;
    scanAll: () => Promise< { message: string } >;
  };
  directories: {
    tree: ( rootId: string ) => Promise< { root: { id?: string; name?: string }; tree: MediaDirectoryTree[] } >;
    list: ( rootId: string, directoryId?: string | null, page?: ApiPage ) => Promise< {
      root: { id: string; name?: string };
      current: MediaDirectory | null;
      breadcrumbs: Pick< MediaDirectory, 'id' | 'name' | 'path' >[];
      directories: MediaDirectoryEntry[];
      media: MediaRecord[];
      limit: number;
      offset: number;
    } >;
  };
  assets: {
    list: ( mediaId: string ) => Promise< MediaAssetRecord[] >;
    url: ( mediaId: string, kind: string, variant?: string ) => string;
  };
  stream: ( id: string, options?: ApiStreamOptions ) => Promise< Response >;
  tags: {
    list: () => Promise< TagRecord[] >;
    get: ( id: string ) => Promise< TagRecord >;
    create: ( name: string ) => Promise< TagRecord >;
    rename: ( id: string, name: string ) => Promise< TagRecord >;
    delete: ( id: string ) => Promise< void >;
  };
  categories: {
    list: () => Promise< CategoryRecord[] >;
    get: ( id: string ) => Promise< CategoryRecord >;
    create: ( name: string, parentId?: string | null ) => Promise< CategoryRecord >;
    rename: ( id: string, name: string ) => Promise< CategoryRecord >;
    setParent: ( id: string, parentId: string | null ) => Promise< CategoryRecord >;
    delete: ( id: string ) => Promise< void >;
  };
  favorites: {
    list: ( page?: ApiPage ) => Promise< MediaRecord[] >;
    has: ( mediaId: string ) => Promise< ApiFavorite >;
    add: ( mediaId: string ) => Promise< ApiFavorite >;
    remove: ( mediaId: string ) => Promise< void >;
  };
  markers: {
    list: ( page?: ApiPage ) => Promise< MarkerRecord[] >;
    get: ( id: string ) => Promise< MarkerRecord >;
    update: ( id: string, data: MarkerUpdate ) => Promise< MarkerRecord >;
    delete: ( id: string ) => Promise< void >;
    forMedia: ( id: string, page?: ApiPage ) => Promise< MarkerRecord[] >;
    createForMedia: ( id: string, data: Pick< MarkerRecord, 'positionMs' > &
      Partial< Pick< MarkerRecord, 'title' | 'description' > > ) => Promise< { id: string } >;
    clearForMedia: ( id: string ) => Promise< { deleted: number } >;
  };
  playlists: {
    list: ( page?: ApiPage ) => Promise< PlaylistRecord[] >;
    get: ( id: string ) => Promise< PlaylistRecord >;
    create: ( name: string, description?: string ) => Promise< PlaylistRecord >;
    update: ( id: string, data: PlaylistUpdate ) => Promise< PlaylistRecord >;
    delete: ( id: string ) => Promise< void >;
    items: ( id: string, page?: ApiPage ) => Promise< PlaylistItemRecord[] >;
    add: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord[] >;
    remove: ( id: string, mediaId: string ) => Promise< void >;
    clear: ( id: string ) => Promise< { deleted: number } >;
    move: ( id: string, mediaId: string, position: number ) => Promise< PlaylistItemRecord[] >;
    contains: ( id: string, mediaId: string ) => Promise< { inPlaylist: boolean } >;
    forMedia: ( mediaId: string, page?: ApiPage ) => Promise< PlaylistRecord[] >;
    next: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord | null >;
    previous: ( id: string, mediaId: string ) => Promise< PlaylistItemRecord | null >;
  };
  prefs: {
    all: () => Promise< ApiPreferences >;
    get: < T > ( key: string ) => Promise< ApiPreference< T > >;
    set: < T > ( key: string, value: T ) => Promise< ApiPreference< T > >;
    reset: ( key: string ) => Promise< ApiDeleteResult >;
    resetAll: () => Promise< ApiDeleteResult >;
  };
  jobs: {
    list: ( query?: Record< string, string | number | undefined > ) => Promise< unknown[] >;
    get: ( id: string ) => Promise< unknown >;
    stats: () => Promise< Record< string, number > >;
    enqueue: ( data: unknown ) => Promise< { job: unknown } >;
  };
  database: {
    stats: () => Promise< Record< string, number > >;
  };
}


const ApiContext = createContext< ApiContextValue | null >( null );


export function ApiProvider ( { children }: { children: ReactNode } ) {
  const [ token, setToken ] = useState< string | null >( null );
  const [ user, setUser ] = useState< ApiSession[ 'user' ] | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );

  const request = useCallback( async < T, > ( path: string, options: ApiRequestOptions = {} ) : Promise< T > => {
    const url = new URL( `${ API }${ path }`, window.location.origin );

    for ( const [ key, value ] of Object.entries( options.query ?? {} ) )
      if ( value !== undefined && value !== null ) url.searchParams.set( key, String( value ) );

    const headers = new Headers( options.headers );
    if ( token ) headers.set( 'Authorization', `Bearer ${ token }` );

    if ( options.body !== undefined && ! headers.has( 'Content-Type' ) )
      headers.set( 'Content-Type', 'application/json' );

    const response = await fetch( url, { ...options, headers } );

    if ( response.status === 401 && path !== '/auth/login' ) {
      setToken( null ), setUser( null );
      sessionStorage.removeItem( TOKEN_KEY );
    }

    if ( ! response.ok ) {
      let message = response.statusText || 'API request failed';

      try {
        const body = await response.json() as { error?: string };
        if ( body.error ) message = body.error;
      } catch {}

      const apiError = new ApiError( message, response.status );
      setError( message );
      throw apiError;
    }

    if ( response.status === 204 ) return undefined as T;
    if ( response.headers.get( 'Content-Type' )?.includes( 'application/json' ) )
      return response.json() as Promise< T >;

    return response as T;
  }, [ token ] );
}


export function useApi () : ApiContextValue {
  const context = useContext( ApiContext );
  if ( ! context ) throw new Error( 'useApi must be used within ApiProvider' );
  return context;
}
