import { useEffect, useRef, useState } from 'react';


interface ApiDataState< T > {
  key: string;
  data: T | null;
  loading: boolean;
  error: string | null;
}


export function useApiData < T > ( key: string, load: ( signal: AbortSignal ) => Promise< T > ) {
  const loadRef = useRef( load );
  const [ state, setState ] = useState< ApiDataState< T > >( { key: '', data: null, loading: true, error: null } );

  loadRef.current = load;

  useEffect( () => {
    const controller = new AbortController();
    let active = true;

    setState( { key, data: null, loading: true, error: null } );

    loadRef.current( controller.signal ).then( data => {
      if ( active ) setState( { key, data, loading: false, error: null } );
    } ).catch( err => {
      if ( active && ! controller.signal.aborted ) setState( {
        key, data: null, loading: false,
        error: err instanceof Error ? err.message : 'Unable to load data.'
      } );
    } );

    return () => { active = false; controller.abort() };
  }, [ key ] );

  return state.key === key ? state : { key, data: null, loading: true, error: null };
}
