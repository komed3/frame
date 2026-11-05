import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDateTime, formatDuration } from '@/src/client/utils/format';
import type { MarkerRecord } from '@/src/shared/types/markers';
import type { MediaRecord } from '@/src/shared/types/media';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';


interface MarkerPageData {
  markers: MarkerRecord[];
  media: Record< string, MediaRecord | null >;
}


export function Markers () {
  const { markers, media } = useApi();

  const [ refresh, setRefresh ] = useState( 0 );
  const [ offset, setOffset ] = useState( 0 );
  const [ actionError, setActionError ] = useState< string | null >( null );
  const [ deleting, setDeleting ] = useState< string | null >( null );


  const { data, loading, error } = useApiData< MarkerPageData >( `${ offset }:${ refresh }`, async () => {
    const items = await markers.list( { limit: MEDIA_PAGE_SIZE, offset } );
    return { markers: items, media: Object.fromEntries( await Promise.all(
      [ ...new Set( items.map( m => m.mediaId ) ) ].map( async id => [ id, await media.get( id ) ] )
    ) ) };
  } );


  usePageTitle( 'Markers' );


  const remove = async ( id: string ) => {
    setDeleting( id ), setActionError( null );

    try { await markers.delete( id ); setRefresh( v => v + 1 ) }
    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not delete marker.' ) }
    finally { setDeleting( null ) }
  };


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Markers
      </h1>

      { actionError && (
        <p role= 'alert' className= 'text-sm text-red-400'>
          { actionError }
        </p>
      ) }

      { loading ? (
        <Loading className= 'min-h-64' />
      ) : error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : ! data?.markers.length ? (
        <p className= 'py-16 text-center text-slate-400'>
          No markers found.
        </p>
      ) : (
        <></>
      ) }
    </div>
  );
}
