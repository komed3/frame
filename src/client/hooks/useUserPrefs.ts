import { useApi } from '@/src/client/context/ApiContext';
import type { PrefName, PrefValue } from '@/src/shared/types/pref';
import { useCallback, useEffect, useState } from 'react';


export function useUserPrefs < K extends PrefName > ( keys: readonly K[] ) {
  const { prefs } = useApi();
  const [ values, setValues ] = useState< PrefValue< K >[] >( [] );

  useEffect( () => {
    let active = true;

    Promise.all( keys.map( key => prefs.get( key ) ) ).then( results => {
      if ( active ) setValues( results.map( result => result.value ) );
    } );

    return () => { active = false };
  }, [ keys, prefs ] );

  const setPref = useCallback( < P extends K > ( key: P, value: PrefValue< P > ) => {
    setValues( current => current.map( ( v, i ) => i === keys.indexOf( key ) ? value : v ) );
    prefs.set( key, value );
  }, [ keys, prefs ] );

  return [ values, setPref ] as const;
}
