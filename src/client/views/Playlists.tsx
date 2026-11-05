import { Loading } from '@/src/client/components/Loading';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDateTime } from '@/src/client/utils/format';
import { ListVideoIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';


export function Playlists () {
  const { playlists } = useApi();
  const [ offset, setOffset ] = useState( 0 );


  const { data, loading, error } = useApiData( String( offset ), () =>
    playlists.list( { limit: MEDIA_PAGE_SIZE, offset } )
  );


  usePageTitle( 'Playlists' );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Playlists
      </h1>

      { loading ? (
        <Loading className= 'min-h-64' />
      ) : error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : ! data?.length ? (
        <p className= 'py-16 text-center text-slate-400'>
          No playlists found.
        </p>
      ) : (
        <>
          <div className= 'overflow-hidden bg-slate-900/40 divide-y divide-slate-700/70 rounded shadow-lg'>
            { data.map( ( { id, updatedAt } ) => (
              <Link
                key= { id } to= { `/playlist/${ id }` }
                className= 'group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/5'
              >
                <ListVideoIcon size= { 20 } className= 'shrink-0 text-slate-400' />

                <span className= 'shrink-0 leading-5 text-xs text-slate-500'>
                  { formatDateTime( updatedAt ) }
                </span>
              </Link>
            ) ) }
          </div>
        </>
      ) }
    </div>
  );
}
