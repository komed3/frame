import { Loading } from '@/src/client/components/Loading';
import { Pagination } from '@/src/client/components/Pagination';
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
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        History
      </h1>

      { error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : loading ? (
        <Loading className= 'min-h-64' />
      ) : ! data?.length ? (
        <p className= 'py-16 text-center text-slate-400'>
          No playback history found.
        </p>
      ) : (
        <>
          <div className= 'overflow-x-auto bg-slate-800 rounded shadow-lg'>
            <table className= 'w-full text-sm text-left'>
              <thead className= 'text-xs text-slate-400 uppercase tracking-wider bg-slate-900/40'>
                <tr className= '*:px-5 *:py-4 *:font-medium'>
                  <th>Date</th>
                  <th>Media</th>
                  <th>Type</th>
                  <th className= 'text-right'>Watched</th>
                  <th className= 'text-right'>Status</th>
                </tr>
              </thead>
            </table>
          </div>

          <Pagination
            offset= { offset }
            limit= { PAGE_SIZE }
            itemCount= { data.length }
            onChange= { v => { setOffset( v ), window.scrollTo( 0, 0 ) } }
          />
        </>
      ) }
    </div>
  );
}
