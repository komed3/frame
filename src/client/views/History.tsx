import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { HistoryRecord } from '@/src/shared/types/plays';
import { useState } from 'react';


const PAGE_SIZE = 50;


export function History () {
  const { plays, user } = useApi();

  const [ offset, setOffset ] = useState( 0 );
  const key = JSON.stringify( [ user?.id ?? null, offset ] );

  const { data, loading, error } = useApiData< HistoryRecord[] >( key, () => {
    if ( ! user ) return Promise.reject( new Error( 'User not found.' ) );
    return plays.list( { limit: PAGE_SIZE, offset } );
  } );


  usePageTitle( 'History' );


  return (
    <></>
  );
}
