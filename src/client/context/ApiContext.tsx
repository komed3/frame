import type {
  ApiDeleteResult, ApiFavorite, ApiHealth, ApiLogin, ApiLoginResult, ApiPage,
  ApiPreference, ApiPreferences, ApiSession, ApiStreamOptions
} from '@/src/shared/types/api';
import type { MediaRecord, MediaListOptions } from '@/src/shared/types/media';
import type { MediaSearchOptions, MediaSearchResult } from '@/src/shared/types/search';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryTree } from '@/src/shared/types/directories';
import type { MediaRoot } from '@/src/shared/types/roots';
import type { TagRecord, CategoryRecord } from '@/src/shared/types/taxonomy';
import type { PlaylistRecord, PlaylistItemRecord, PlaylistUpdate } from '@/src/shared/types/playlists';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import type { FavoriteRecord } from '@/src/shared/types/favorites';
import type { JobKind, JobRecord, JobStats, JobStatus, EnqueueJob } from '@/src/shared/types/job';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import type { PrefName, PrefSchema, PrefTable, PrefValue } from '@/src/shared/types/pref';
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
    scan: ( id: string ) => Promise< { jobId: string } >;
    scanAll: () => Promise< { message: string } >;
  };
  directories: {
    tree: ( rootId: string ) => Promise< { root: { id?: string; name?: string }; tree: MediaDirectoryTree[] } >;
    list: ( rootId: string, directoryId?: string | null, page?: ApiPage ) => Promise< {
      root: { id: string; name?: string };
      current: MediaDirectory | null;
      breadcrumbs: { id: string | null; name: string | undefined; path: string }[];
      directories: MediaDirectoryEntry[];
      media: MediaRecord[];
      limit: number;
      offset: number;
    } >;
  };
  assets: {
    list: ( mediaId: string ) => Promise< {
      id: string;
      mediaId: string;
      kind: MediaAssetKind;
      variant: string;
      fingerprint: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      width: number | null;
      height: number | null;
      data: Record< string, unknown >;
      createdAt: string;
      url: string;
    }[] >;
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
    list: ( page?: ApiPage ) => Promise< FavoriteRecord[] >;
    has: ( mediaId: string ) => Promise< ApiFavorite >;
    add: ( mediaId: string ) => Promise< ApiFavorite & { added: boolean } >;
    remove: ( mediaId: string ) => Promise< void >;
  };
  markers: {
    list: ( page?: ApiPage ) => Promise< MarkerRecord[] >;
    get: ( id: string ) => Promise< MarkerRecord | null >;
    update: ( id: string, data: MarkerUpdate ) => Promise< MarkerRecord | null >;
    delete: ( id: string ) => Promise< void >;
    forMedia: ( id: string, page?: ApiPage ) => Promise< MarkerRecord[] >;
    createForMedia: ( id: string, data: Pick< MarkerRecord, 'positionMs' > &
      Partial< Pick< MarkerRecord, 'title' | 'description' > > ) => Promise< { id: string } >;
    clearForMedia: ( id: string ) => Promise< { deleted: number } >;
  };
  playlists: {
    list: ( page?: ApiPage ) => Promise< PlaylistRecord[] >;
    get: ( id: string ) => Promise< PlaylistRecord | null >;
    create: ( name: string, description?: string ) => Promise< PlaylistRecord | null >;
    update: ( id: string, data: PlaylistUpdate ) => Promise< PlaylistRecord | null >;
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
    all: () => Promise< { schema: PrefTable; values: PrefSchema } >;
    get: < K extends PrefName > ( key: K ) => Promise< ApiPreference< PrefValue< K > > >;
    set: < K extends PrefName > ( key: K, value: PrefValue< K > ) => Promise< ApiPreference< PrefValue< K > > >;
    reset: ( key: PrefName ) => Promise< ApiDeleteResult >;
    resetAll: () => Promise< ApiDeleteResult >;
  };
  jobs: {
    list: ( filters?: { status?: JobStatus; kind?: JobKind; rootId?: string; mediaId?: string } & ApiPage ) => Promise< JobRecord[] >;
    get: ( id: string ) => Promise< JobRecord | null >;
    stats: () => Promise< JobStats >;
    enqueue: ( data: EnqueueJob ) => Promise< { job: JobRecord | null } >;
  };
  database: {
    stats: () => Promise< Record< string, unknown > >;
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

    const { query: _, ...init } = options;
    const res = await fetch( url, { ...init, headers } );

    if ( res.status === 401 && path !== '/auth/login' ) {
      setToken( null ), setUser( null );
      sessionStorage.removeItem( TOKEN_KEY );
    }

    if ( ! res.ok ) {
      let message = res.statusText || 'API request failed';

      try {
        const body = await res.json() as { error?: string };
        if ( body.error ) message = body.error;
      } catch {}

      setError( message );
      throw new ApiError( message, res.status );
    }

    setError( null );

    if ( res.status === 204 ) return undefined as T;
    if ( res.headers.get( 'Content-Type' )?.includes( 'application/json' ) ) return res.json() as Promise< T >;

    return res as T;
  }, [ token ] );


  const refreshSession = useCallback( async () => {
    const sessionToken = token ?? sessionStorage.getItem( TOKEN_KEY );
    if ( ! sessionToken ) { setUser( null ), setLoading( false ); return }
    if ( ! token ) setToken( sessionToken );

    try {
      const res = await fetch( `${ API }/auth/me`, {
        headers: { Authorization: `Bearer ${ sessionToken }` }
      } );

      if ( ! res.ok ) throw new ApiError( 'Session expired', res.status );
      const result = await res.json() as ApiSession;
      setUser( result.user ), setError( null );
    } catch {
      setToken( null ), setUser( null );
      sessionStorage.removeItem( TOKEN_KEY );
    } finally {
      setLoading( false );
    }
  }, [ token ] );


  useEffect( () => void refreshSession(), [ refreshSession ] );


  const login = useCallback( async ( credentials: ApiLogin ) => {
    setLoading( true ), setError( null );

    try {
      const res = await request< ApiLoginResult >( '/auth/login', {
        method: 'POST', body: JSON.stringify( credentials )
      } );

      sessionStorage.setItem( TOKEN_KEY, res.token );
      setToken( res.token ), setUser( res.user );
    } finally {
      setLoading( false );
    }
  }, [ request ] );


  const logout = useCallback( async () => {
    try { if ( token ) await request< void >( '/auth/logout', { method: 'POST' } ) }
    finally {
      sessionStorage.removeItem( TOKEN_KEY );
      setToken( null ), setUser( null );
    }
  }, [ request, token ] );


  const clearError = useCallback( () => setError( null ), [] );
  const pageQuery = ( page?: ApiPage ) => ( { limit: page?.limit, offset: page?.offset } );
  const e = encodeURIComponent;


  const value = useMemo< ApiContextValue >( () => ( {
    user, token, authenticated: user !== null, loading, error, request, login, logout,
    refreshSession, clearError, health: () => request< ApiHealth >( '/health' ),

    media: {
      list: options => request< MediaRecord[] >( '/media', { query: options } ),
      get: id => request< MediaRecord | null >( `/media/${ e( id ) }` ),
      metadata: id => request< MediaMetadataRecord[] >( `/media/${ e( id ) }/metadata` ),
      setMetadata: ( id, key, value ) => request< MediaMetadataRecord | null >(
        `/media/${ e( id ) }/metadata/${ e( key ) }`,
        { method: 'PUT', body: JSON.stringify( { value } ) }
      ),
      deleteMetadata: ( id, key ) => request( `/media/${ e( id ) }/metadata/${ e( key ) }`, {
        method: 'DELETE'
      } ),
      tags: id => request( `/media/${ e( id ) }/tags` ),
      setTags: ( id, tagIds ) => request( `/media/${ e( id ) }/tags`, {
        method: 'PUT', body: JSON.stringify( { tagIds } )
      } ),
      categories: id => request( `/media/${ e( id ) }/categories` ),
      setCategories: ( id, categoryIds ) => request( `/media/${ e( id ) }/categories`, {
        method: 'PUT', body: JSON.stringify( { categoryIds } )
      } )
    },

    search: options => request< MediaSearchResult >( '/search', {
      method: 'POST', body: JSON.stringify( options )
    } ),

    roots: {
      list: () => request< MediaRoot[] >( '/root' ),
      scan: id => request( `/root/${ e( id ) }/scan`, { method: 'POST' } ),
      scanAll: () => request( '/root/scan-all', { method: 'POST' } )
    },

    directories: {
      tree: rootId => request( `/dir/${ e( rootId ) }/tree` ),
      list: ( rootId, directoryId, page ) => request( `/dir/${ e( rootId ) }`, {
        query: { directoryId, ...pageQuery( page ) }
      } )
    },

    assets: {
      list: id => request( `/assets/${ e( id ) }` ),
      url: ( id, kind, variant = 'default' ) => `${ API }/assets/${ e( id ) }/${ kind }/${ e( variant ) }`
    },

    stream: ( id, options = {} ) => {
      const headers = new Headers();
      if ( token ) headers.set( 'Authorization', `Bearer ${ token }` );
      if ( options.range ) headers.set( 'Range', options.range );

      return fetch( `${ API }/stream/${ e( id ) }`, { headers, signal: options.signal } ).then( async res => {
        if ( ! res.ok && res.status !== 206 ) {
          let message = res.statusText || 'Stream request failed';

          try {
            const body = await res.json() as { error?: string };
            if ( body.error ) message = body.error;
          } catch {}

          throw new ApiError( message, res.status );
        }

        return res;
      } );
    },

    tags: {
      list: () => request< TagRecord[] >( '/tag' ),
      get: id => request( `/tag/${ e( id ) }` ),
      create: name => request( '/tag', { method: 'POST', body: JSON.stringify( { name } ) } ),
      rename: ( id, name ) => request( `/tag/${ e( id ) }`, { method: 'PATCH', body: JSON.stringify( { name } ) } ),
      delete: id => request( `/tag/${ e( id ) }`, { method: 'DELETE' } )
    },

    categories: {
      list: () => request< CategoryRecord[] >( '/category' ),
      get: id => request( `/category/${ e( id ) }` ),
      create: ( name, parentId = null ) => request( '/category', {
        method: 'POST', body: JSON.stringify( { name, parentId } )
      } ),
      rename: ( id, name ) => request( `/category/${ e( id ) }`, {
        method: 'PATCH', body: JSON.stringify( { name } )
      } ),
      setParent: ( id, parentId ) => request( `/category/${ e( id ) }/parent`, {
        method: 'PUT', body: JSON.stringify( { parentId } )
      } ),
      delete: id => request( `/category/${ e( id ) }`, { method: 'DELETE' } )
    },
  } ), [ user, token, loading, error, request, login, logout, refreshSession, clearError ] );
}


export function useApi () : ApiContextValue {
  const context = useContext( ApiContext );
  if ( ! context ) throw new Error( 'useApi must be used within ApiProvider' );
  return context;
}
