import { useApi } from '@/src/client/context/ApiContext';
import type { PrefName, PrefValue } from '@/src/shared/types/pref';
import { useCallback, useEffect, useRef, useState } from 'react';


export function useUserPrefs < K extends PrefName > ( keys: readonly K[] ) {
  const { prefs } = useApi();
  const keysRef = useRef( keys );
  keysRef.current = keys;

  const [ values, setValues ] = useState< PrefValue< K >[] >( [] );
  const key = keys.join( '\0' );


  useEffect( () => {
    let active = true;

    Promise.all( keysRef.current.map( key => prefs.get( key ) ) ).then( results => {
      if ( active ) setValues( results.map( result => result.value ) );
    } );

    return () => { active = false };
  }, [ key, prefs ] );

  const setPref = useCallback( < P extends K > ( key: P, value: PrefValue< P > ) => {
    setValues( current => current.map( ( v, i ) => i === keysRef.current.indexOf( key ) ? value : v ) );
    prefs.set( key, value );
  }, [ prefs ] );

  return [ values, setPref ] as const;
}
