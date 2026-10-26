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
      get: id => request( `/tag/${ e( id ) }` ),
      create: name => request( '/tag', { method: 'POST', body: JSON.stringify( { name } ) } ),
      rename: ( id, name ) => request( `/tag/${ e( id ) }`, { method: 'PATCH', body: JSON.stringify( { name } ) } ),
      delete: id => request( `/tag/${ e( id ) }`, { method: 'DELETE' } )
    },

    categories: {
      list: () => request< CategoryRecord[] >( '/category' ),
      get: id => request( `/category/${ e( id ) }` ),
      create: ( name, parentId = null ) => request( '/category', { method: 'POST', body: JSON.stringify( { name, parentId } ) } ),
      rename: ( id, name ) => request( `/category/${ e( id ) }`, { method: 'PATCH', body: JSON.stringify( { name } ) } ),
      setParent: ( id, parentId ) => request( `/category/${ e( id ) }/parent`, { method: 'PUT', body: JSON.stringify( { parentId } ) } ),
      delete: id => request( `/category/${ e( id ) }`, { method: 'DELETE' } )
    },

    favorites: {
      list: page => request< FavoriteRecord[] >( '/favorite', { query: pageQuery( page ) } ),
      has: mediaId => request( `/favorite/${ e( mediaId ) }` ),
      add: mediaId => request( `/favorite/${ e( mediaId ) }`, { method: 'POST' } ),
      remove: mediaId => request( `/favorite/${ e( mediaId ) }`, { method: 'DELETE' } )
    },

    markers: {
      list: page => request< MarkerRecord[] >( '/marker', { query: pageQuery( page ) } ),
      get: id => request( `/marker/${ e( id ) }` ),
      update: ( id, data ) => request( `/marker/${ e( id ) }`, { method: 'PATCH', body: JSON.stringify( data ) } ),
      delete: id => request( `/marker/${ e( id ) }`, { method: 'DELETE' } ),
      forMedia: ( id, page ) => request( `/media/${ e( id ) }/markers`, { query: pageQuery( page ) } ),
      createForMedia: ( id, data ) => request( `/media/${ e( id ) }/markers`, { method: 'POST', body: JSON.stringify( data ) } ),
      clearForMedia: id => request( `/media/${ e( id ) }/markers`, { method: 'DELETE' } )
    },

    playlists: {
      list: page => request< PlaylistRecord[] >( '/playlist', { query: pageQuery( page ) } ),
      get: id => request( `/playlist/${ e( id ) }` ),
      create: ( name, description ) => request( '/playlist', { method: 'POST', body: JSON.stringify( { name, description } ) } ),
      update: ( id, data ) => request( `/playlist/${ e( id ) }`, { method: 'PATCH', body: JSON.stringify( data ) } ),
      delete: id => request( `/playlist/${ e( id ) }`, { method: 'DELETE' } ),
      items: ( id, page ) => request( `/playlist/${ e( id ) }/items`, { query: pageQuery( page ) } ),
      add: ( id, mediaId ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, { method: 'POST' } ),
      remove: ( id, mediaId ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, { method: 'DELETE' } ),
      clear: id => request( `/playlist/${ e( id ) }/items`, { method: 'DELETE' } ),
      move: ( id, mediaId, position ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }`, {
        method: 'PATCH', body: JSON.stringify( { position } )
      } ),
      contains: ( id, mediaId ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }` ),
      forMedia: ( mediaId, page ) => request( `/playlist/for-media/${ e( mediaId ) }`, { query: pageQuery( page ) } ),
      next: ( id, mediaId ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }/next` ),
      previous: ( id, mediaId ) => request( `/playlist/${ e( id ) }/items/${ e( mediaId ) }/prev` )
    },

    prefs: {
      all: () => request( '/pref' ),
      get: key => request( `/pref/${ key }` ),
      set: ( key, value ) => request( `/pref/${ key }`, { method: 'PUT', body: JSON.stringify( { value } ) } ),
      reset: key => request( `/pref/${ key }`, { method: 'DELETE' } ),
      resetAll: () => request( '/pref', { method: 'DELETE' } )
    },

    jobs: {
      list: filters => request< JobRecord[] >( '/job', { query: filters } ),
      get: id => request( `/job/${ e( id ) }` ),
      stats: () => request< JobStats >( '/job/stats' ),
      enqueue: data => request( '/job', { method: 'POST', body: JSON.stringify( data ) } )
    },

    database: {
      stats: () => request< Record< string, unknown > >( '/db/stats' )
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
