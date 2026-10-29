import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { MediaType } from '@/src/shared/types/media';
import type {
  MediaSearchOptions, MediaSearchProgress, MediaSearchQueryMode,
  MediaSearchResult, MediaSearchSort
} from '@/src/shared/types/search';
import { useNavigate, useSearchParams } from 'react-router';


export function Search () {
  const { search, user } = useApi();
  const [ searchParams ] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get( 'query' ) ?? '';
  const paramsKey = searchParams.toString();
  const key = JSON.stringify( [ paramsKey, user?.id ?? null ] );

  const { data: result, loading, error } = useApiData< MediaSearchResult >( key, () => {
    const params = new URLSearchParams( paramsKey );
    const offset = Math.max( 0, Number( params.get( 'offset' ) ) || 0 );
    const favorite = params.has( 'favorite' ) ? params.get( 'favorite' ) === 'true' : undefined;
    const played = params.has( 'played' ) ? params.get( 'played' ) === 'true' : undefined;
    const progress = params.get( 'progress' ) as MediaSearchProgress | null;

    const options: MediaSearchOptions = {
      query, favorite, played, limit: MEDIA_PAGE_SIZE, offset,
      queryMode: ( params.get( 'queryMode' ) ?? 'all' ) as MediaSearchQueryMode,
      types: params.has( 'types' ) ? [ params.get( 'types' ) as MediaType ] : undefined,
      categoryIds: params.has( 'categoryIds' ) ? [ params.get( 'categoryIds' )! ] : undefined,
      tagIds: params.has( 'tagIds' ) ? [ params.get( 'tagIds' )! ] : undefined,
      available: params.has( 'available' ) ? params.get( 'available' ) === 'true' : undefined,
      progress: progress ?? undefined,
      userId: favorite !== undefined || played !== undefined || progress ? user?.id : undefined,
      sortBy: ( params.get( 'sortBy' ) ?? 'relevance' ) as MediaSearchSort,
      sortDirection: params.get( 'sortDirection' ) === 'desc' ? 'desc' : 'asc'
    };

    return search( options );
  } );

  usePageTitle( query ? `Search: ${ query }` : 'Search' );


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
