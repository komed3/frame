import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { MediaType } from '@/src/shared/types/media';
import type {
  MediaSearchOptions, MediaSearchProgress, MediaSearchQueryMode,
  MediaSearchResult, MediaSearchSort
} from '@/src/shared/types/search';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';


export function Search () {
  const { search, user } = useApi();
  const navigate = useNavigate();
  const [ searchParams ] = useSearchParams();

  const [ result, setResult ] = useState< MediaSearchResult | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );
  const query = searchParams.get( 'query' ) ?? '';


  usePageTitle( query ? `Search: ${ query }` : 'Search' );

  useEffect( () => {
    let active = true;

    const offset = Math.max( 0, Number( searchParams.get( 'offset' ) ) || 0 );
    const favorite = searchParams.has( 'favorite' ) ? searchParams.get( 'favorite' ) === 'true' : undefined;
    const played = searchParams.has( 'played' ) ? searchParams.get( 'played' ) === 'true' : undefined;
    const progress = searchParams.get( 'progress' ) as MediaSearchProgress | null;

    const options: MediaSearchOptions = {
      query, favorite, played, limit: MEDIA_PAGE_SIZE, offset,
      queryMode: ( searchParams.get( 'queryMode' ) ?? 'all' ) as MediaSearchQueryMode,
      types: searchParams.has( 'types' ) ? [ searchParams.get( 'types' ) as MediaType ] : undefined,
      categoryIds: searchParams.has( 'categoryIds' ) ? [ searchParams.get( 'categoryIds' )! ] : undefined,
      tagIds: searchParams.has( 'tagIds' ) ? [ searchParams.get( 'tagIds' )! ] : undefined,
      available: searchParams.has( 'available' ) ? searchParams.get( 'available' ) === 'true' : undefined,
      progress: progress ?? undefined,
      userId: favorite !== undefined || played !== undefined || progress ? user?.id : undefined,
      sortBy: ( searchParams.get( 'sortBy' ) ?? 'relevance' ) as MediaSearchSort,
      sortDirection: searchParams.get( 'sortDirection' ) === 'desc' ? 'desc' : 'asc'
    };

    setLoading( true ), setError( null );
    search( options ).then( res => { if ( active ) setResult( res ) } )
      .catch( err => { if ( active ) setError( err instanceof Error ? err.message : 'Could not load search results.' ) } )
      .finally( () => { if ( active ) setLoading( false ) } );

    return () => { active = false; };
  }, [ search, searchParams, query, user?.id ] );


  const changePage = ( offset: number ) => {
    const params = new URLSearchParams( searchParams );
    params.set( 'offset', String( offset ) );
    navigate( `/search?${ params.toString() }` );
    window.scrollTo( 0, 0 );
  };


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-4'>
      { error ? (
        <p className= 'py-16 text-center text-red-400'>{ error }</p>
      ) : (
        <MediaBrowser
          media= { result?.items ?? [] }
          loading= { loading }
          offset= { result?.offset ?? 0 }
          limit= { result?.limit ?? MEDIA_PAGE_SIZE }
          total= { result?.total }
          onPageChange= { changePage }
          onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
        />
      ) }
    </div>
  );
}
