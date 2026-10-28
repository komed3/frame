import type {
  ApiAssetRecord, ApiContextValue, ApiDeleteResult, ApiDirectoryListResult, ApiDirectoryTreeResult,
  ApiEnqueueResult, ApiFavorite, ApiFavoriteAddResult, ApiHealth, ApiLogin, ApiLoginResult,
  ApiMarkerClearResult, ApiPage, ApiPlaylistClearResult, ApiPlaylistContainsResult, ApiPreference,
  ApiPreferences, ApiRequestOptions, ApiRootScanAllResult, ApiRootScanResult, ApiSession
} from '@/src/shared/types/api';
import type { DatabaseStats } from '@/src/shared/types/database';
import type { FavoriteRecord } from '@/src/shared/types/favorites';
import type { JobRecord, JobStats } from '@/src/shared/types/job';
import type { MarkerRecord } from '@/src/shared/types/markers';
import type { MediaRecord } from '@/src/shared/types/media';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import type { PlaylistItemRecord, PlaylistRecord } from '@/src/shared/types/playlists';
import type { PrefValue } from '@/src/shared/types/pref';
import type { MediaRoot } from '@/src/shared/types/roots';
import type { MediaSearchResult } from '@/src/shared/types/search';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';


const API = '/api';
const TOKEN_KEY = 'frame.session';


export class ApiError extends Error {
  constructor ( message: string, public status: number ) {
    super( message );
    this.name = 'ApiError';
  }
}


const ApiContext = createContext< ApiContextValue | null >( null );
const inFlightRequests = new Map< string, Promise< unknown > >();


export function ApiProvider ( { children }: { children: ReactNode } ) {
  const [ token, setToken ] = useState< string | null >( () => localStorage.getItem( TOKEN_KEY ) );
  const [ user, setUser ] = useState< ApiSession[ 'user' ] | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );


  const request = useCallback( < T, > ( path: string, options: ApiRequestOptions = {} ) : Promise< T > => {
    const url = new URL( `${ API }${ path }`, window.location.origin );

    for ( const [ key, value ] of Object.entries( options.query ?? {} ) )
      if ( value !== undefined && value !== null ) url.searchParams.set( key, String( value ) );

    const headers = new Headers( options.headers );
    if ( token ) headers.set( 'Authorization', `Bearer ${ token }` );
    if ( options.body !== undefined && ! headers.has( 'Content-Type' ) )
      headers.set( 'Content-Type', 'application/json' );

    const { query: _, ...init } = options, method = ( init.method ?? 'GET' ).toUpperCase();
    const deduplicate = method === 'GET' && init.body === undefined && init.signal === undefined;
    const key = JSON.stringify( [ method, url.href, Array.from( headers.entries() ).sort(
      ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] )
    ) ] );

    if ( deduplicate ) {
      const existing = inFlightRequests.get( key );
      if ( existing ) return existing as Promise< T >;
    }

    const execute = async () : Promise< T > => {
      const res = await fetch( url, { ...init, headers } );

      if ( res.status === 401 && path !== '/auth/login' ) {
        setToken( null ), setUser( null );
        localStorage.removeItem( TOKEN_KEY );
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
    };

    const pending = execute();

    if ( deduplicate ) {
      inFlightRequests.set( key, pending );

      pending.finally( () => {
        if ( inFlightRequests.get( key ) === pending ) inFlightRequests.delete( key );
      } ).catch( () => {} );
    }

    return pending;
  }, [ token ] );


  const refreshSession = useCallback( async () => {
    const sessionToken = token ?? localStorage.getItem( TOKEN_KEY );
    if ( ! sessionToken ) { setUser( null ), setLoading( false ); return }
    if ( ! token ) setToken( sessionToken );

    try {
      const res = await fetch( `${ API }/auth/me`, {
        headers: { Authorization: `Bearer ${ sessionToken }` }
      } );

      if ( ! res.ok ) throw new ApiError( 'Session expired', res.status );

      const result = await res.json() as ApiSession;
      setUser( result.user ), setError( null );
    } catch ( err ) {
      if ( err instanceof ApiError && err.status === 401 )
        setToken( null ), setUser( null ), localStorage.removeItem( TOKEN_KEY );

      else setError( 'Could not verify session. Please check your connection.' );
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

      localStorage.setItem( TOKEN_KEY, res.token );
      setToken( res.token ), setUser( res.user );
    } finally {
      setLoading( false );
    }
  }, [ request ] );


  const logout = useCallback( async () => {
    try { if ( token ) await request< void >( '/auth/logout', { method: 'POST' } ) }
    finally {
      localStorage.removeItem( TOKEN_KEY );
      setToken( null ), setUser( null );
    }
  }, [ request, token ] );


  const clearError = useCallback( () => setError( null ), [] );
  const pageQuery = ( page?: Partial< ApiPage > ) => ( { limit: page?.limit, offset: page?.offset } );
  const e = encodeURIComponent, s = JSON.stringify;


  const value = useMemo< ApiContextValue >( () => ( {
    user, token, authenticated: user !== null, loading, error, request, login, logout,
    refreshSession, clearError, health: () => request< ApiHealth >( '/health' ),

    media: {
      list: o => request< MediaRecord[] >( '/media', { query: o } ),
      get: id => request< MediaRecord | null >( `/media/${ e( id ) }` ),
      metadata: id => request< MediaMetadataRecord[] >( `/media/${ e( id ) }/metadata` ),
      setMetadata: ( id, key, value ) => request< MediaMetadataRecord | null >( `/media/${ e( id ) }/metadata/${ e( key ) }`, {
        method: 'PUT', body: s( { value } )
      } ),
      deleteMetadata: ( id, key ) => request< void >( `/media/${ e( id ) }/metadata/${ e( key ) }`, { method: 'DELETE' } ),
      tags: id => request< TagRecord[] >( `/media/${ e( id ) }/tags` ),
      setTags: ( id, tagIds ) => request< TagRecord[] >( `/media/${ e( id ) }/tags`, { method: 'PUT', body: s( { tagIds } ) } ),
      categories: id => request< CategoryRecord[] >( `/media/${ e( id ) }/categories` ),
      setCategories: ( id, categoryIds ) => request< CategoryRecord[] >( `/media/${ e( id ) }/categories`, {
        method: 'PUT', body: s( { categoryIds } )
      } )
    },

    search: options => request< MediaSearchResult >( '/search', { method: 'POST', body: s( options ) } ),

    roots: {
      list: () => request< MediaRoot[] >( '/root' ),
      scan: id => request< ApiRootScanResult >( `/root/${ e( id ) }/scan`, { method: 'POST' } ),
      scanAll: () => request< ApiRootScanAllResult >( '/root/scan-all', { method: 'POST' } )
    },

    directories: {
      tree: rootId => request< ApiDirectoryTreeResult >( `/dir/${ e( rootId ) }/tree` ),
      list: ( rootId, directoryId, page ) => request< ApiDirectoryListResult >( `/dir/${ e( rootId ) }`, {
        query: { directoryId, ...pageQuery( page ) }
      } )
    },

    assets: {
      list: id => request< ApiAssetRecord[] >( `/assets/${ e( id ) }` ),
      url: ( id, kind, variant = 'default' ) => `${ API }/assets/${ e( id ) }/${ kind }/${ e( variant ) }`
    },

    stream: async ( id, options = {} ) => {
      const headers = new Headers();
      if ( token ) headers.set( 'Authorization', `Bearer ${ token }` );
      if ( options.range ) headers.set( 'Range', options.range );

      const res = await fetch( `${ API }/stream/${ e( id ) }`, { headers, signal: options.signal } );

      if ( ! res.ok && res.status !== 206 ) {
        let message = res.statusText || 'Stream request failed';

        try {
          const body = await res.json() as { error?: string };
          if ( body.error ) message = body.error;
        } catch {}

        throw new ApiError( message, res.status );
      }

      return res;
    },

    tags: {
      list: () => request< TagRecord[] >( '/tag' ),
      get: id => request< TagRecord | null >( `/tag/${ e( id ) }` ),
      create: name => request< TagRecord | null >( '/tag', { method: 'POST', body: s( { name } ) } ),
      rename: ( id, name ) => request< TagRecord | null >( `/tag/${ e( id ) }`, { method: 'PATCH', body: s( { name } ) } ),
      delete: id => request< void >( `/tag/${ e( id ) }`, { method: 'DELETE' } )
    },

    categories: {
      list: () => request< CategoryRecord[] >( '/category' ),
      get: id => request< CategoryRecord | null >( `/category/${ e( id ) }` ),
      create: ( name, parentId = null ) => request< CategoryRecord | null >( '/category', { method: 'POST', body: s( { name, parentId } ) } ),
      rename: ( id, name ) => request< CategoryRecord | null >( `/category/${ e( id ) }`, { method: 'PATCH', body: s( { name } ) } ),
      setParent: ( id, parentId ) => request< CategoryRecord | null >( `/category/${ e( id ) }/parent`, {
        method: 'PUT', body: s( { parentId } )
      } ),
      delete: id => request< void >( `/category/${ e( id ) }`, { method: 'DELETE' } )
    },

    favorites: {
      list: page => request< FavoriteRecord[] >( '/favorite', { query: pageQuery( page ) } ),
      has: mediaId => request< ApiFavorite >( `/favorite/${ e( mediaId ) }` ),
      add: mediaId => request< ApiFavoriteAddResult >( `/favorite/${ e( mediaId ) }`, { method: 'POST' } ),
      remove: mediaId => request< void >( `/favorite/${ e( mediaId ) }`, { method: 'DELETE' } )
    },

    markers: {
      list: page => request< MarkerRecord[] >( '/marker', { query: pageQuery( page ) } ),
      get: id => request< MarkerRecord | null >( `/marker/${ e( id ) }` ),
      update: ( id, data ) => request< MarkerRecord | null >( `/marker/${ e( id ) }`, { method: 'PATCH', body: s( data ) } ),
      delete: id => request< void >( `/marker/${ e( id ) }`, { method: 'DELETE' } ),
      forMedia: ( id, page ) => request< MarkerRecord[] >( `/media/${ e( id ) }/markers`, { query: pageQuery( page ) } ),
      createForMedia: ( id, data ) => request< Pick< MarkerRecord, 'id' > >( `/media/${ e( id ) }/markers`, {
        method: 'POST', body: s( data )
      } ),
      clearForMedia: id => request< ApiMarkerClearResult >( `/media/${ e( id ) }/markers`, { method: 'DELETE' } )
    },

    playlists: {
      list: page => request< PlaylistRecord[] >( '/playlist', { query: pageQuery( page ) } ),
      get: id => request< PlaylistRecord | null >( `/playlist/${ e( id ) }` ),
      create: ( name, description ) => request< PlaylistRecord | null >( '/playlist', { method: 'POST', body: s( { name, description } ) } ),
      update: ( id, data ) => request< PlaylistRecord | null >( `/playlist/${ e( id ) }`, { method: 'PATCH', body: s( data ) } ),
      delete: id => request< void >( `/playlist/${ e( id ) }`, { method: 'DELETE' } ),
      items: ( id, page ) => request< PlaylistItemRecord[] >( `/playlist/${ e( id ) }/items`, { query: pageQuery( page ) } ),
      add: ( id, mediaId ) => request< PlaylistItemRecord[] >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, { method: 'POST' } ),
      remove: ( id, mediaId ) => request< void >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, { method: 'DELETE' } ),
      clear: id => request< ApiPlaylistClearResult >( `/playlist/${ e( id ) }/items`, { method: 'DELETE' } ),
      move: ( id, mediaId, position ) => request< PlaylistItemRecord[] >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, {
        method: 'PATCH', body: s( { position } )
      } ),
      contains: ( id, mediaId ) => request< ApiPlaylistContainsResult >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }` ),
      forMedia: ( mediaId, page ) => request< PlaylistRecord[] >( `/playlist/for-media/${ e( mediaId ) }`, { query: pageQuery( page ) } ),
      next: ( id, mediaId ) => request< PlaylistItemRecord | null >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }/next` ),
      previous: ( id, mediaId ) => request< PlaylistItemRecord | null >( `/playlist/${ e( id ) }/items/${ e( mediaId ) }/prev` )
    },

    prefs: {
      all: () => request< ApiPreferences >( '/pref' ),
      get: key => request< ApiPreference< PrefValue< typeof key > > >( `/pref/${ key }` ),
      set: ( key, value ) => request< ApiPreference< PrefValue< typeof key > > >( `/pref/${ key }`, { method: 'PUT', body: s( { value } ) } ),
      reset: key => request< ApiDeleteResult >( `/pref/${ key }`, { method: 'DELETE' } ),
      resetAll: () => request< ApiDeleteResult >( '/pref', { method: 'DELETE' } )
    },

    jobs: {
      list: filters => request< JobRecord[] >( '/job', { query: filters } ),
      get: id => request< JobRecord | null >( `/job/${ e( id ) }` ),
      stats: () => request< JobStats >( '/job/stats' ),
      enqueue: data => request< ApiEnqueueResult >( '/job', { method: 'POST', body: s( data ) } )
    },

    database: {
      stats: () => request< DatabaseStats >( '/db/stats' )
    }
  } ), [ user, token, loading, error, request, login, logout, refreshSession, clearError ] );


  return (
    <ApiContext.Provider value= { value }>
      { children }
    </ApiContext.Provider>
  );
}


export function useApi () : ApiContextValue {
  const context = useContext( ApiContext );
  if ( ! context ) throw new Error( 'useApi must be used within ApiProvider' );
  return context;
}
