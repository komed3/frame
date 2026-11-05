import { useApi } from '@/src/client/context/ApiContext';
import type { PrefName, PrefValue } from '@/src/shared/types/pref';
import { useCallback, useEffect, useRef, useState } from 'react';


export function useUserPrefs < K extends PrefName > ( keys: readonly K[] ) {
  const { prefs } = useApi();
  const keysRef = useRef( keys );
  keysRef.current = keys;

  const [ values, setValues ] = useState< PrefValue< K >[] >( [] );
  const [ error, setError ] = useState< string | null >( null );
  const key = keys.join( '\0' );


  const err = ( err: Error ) => setError( err instanceof Error ? err.message : 'Unknown error.' );

  const get = ( active: () => boolean ) => Promise.all( keysRef.current.map( k => prefs.get( k ) ) )
    .then( r => { if ( active() ) setValues( r.map( ( { value } ) => value ) ) } ).catch( err );


  useEffect( () => {
    let active = true; get( () => active );
    return () => { active = false };
  }, [ key, prefs ] );

  const setPref = useCallback( async < P extends K > ( key: P, value: PrefValue< P > ) => {
    setError( null ), setValues( c => c.map( ( v, i ) => i === keysRef.current.indexOf( key ) ? value : v ) );
    return prefs.set( key, value ).catch( err );
  }, [ prefs ] );

  const reset = useCallback( async () => {
    setError( null );
    return prefs.resetAll().then( () => get( () => true ) );
  }, [ prefs ] );

  return [ values, setPref, reset, error ] as const;
}
