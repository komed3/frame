import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { MediaSearchResult } from '@/src/shared/types/search';
import { useState } from 'react';
import { useNavigate } from 'react-router';


export function Favorites () {
  const { search, user } = useApi();
  const navigate = useNavigate();

  const [ page, setPage ] = useState( 0 );
  const key = JSON.stringify( [ user?.id ?? null, page ] );


  const { data: result, loading, error } = useApiData< MediaSearchResult >( key, () => {
    if ( ! user ) return Promise.reject( new Error( 'User not found.' ) );

    return search( {
      favorite: true, userId: user.id, limit: MEDIA_PAGE_SIZE, offset: page,
      sortBy: 'title', sortDirection: 'asc'
    } );
  } );


  usePageTitle( 'Favorites' );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-4'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Favorites
      </h1>

      { error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : (
        <MediaBrowser
          media= { result?.items ?? [] }
          loading= { loading }
          offset= { result?.offset ?? page }
          limit= { result?.limit ?? MEDIA_PAGE_SIZE }
          total= { result?.total }
          onPageChange= { o => { setPage( o ), window.scrollTo( 0, 0 ) } }
          onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
        />
      ) }
    </div>
  );
}
