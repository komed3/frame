import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaSearchResult } from '@/src/shared/types/search';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { FolderIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


interface CategoryPageData {
  category: CategoryRecord | null;
  result: MediaSearchResult;
}


export function Category () {
  const { categories, search } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  const [ offset, setOffset ] = useState( 0 );
  const key = JSON.stringify( [ id ?? null, offset ] );


  const { data, loading, error } = useApiData< CategoryPageData >( key, async () => {
    if ( ! id ) return Promise.reject( new Error( 'Category not found.' ) );

    return Promise.all( [ categories.get( id ), search( {
      categoryIds: [ id ], limit: MEDIA_PAGE_SIZE, offset, sortBy: 'title', sortDirection: 'asc'
    } ) ] ).then( ( [ category, result ] ) => ( { category, result } ) );
  } );

  const category = data?.category ?? null;
  const result = data?.result;


  usePageTitle( category?.name ?? 'Category' );


  if ( ! loading && ! error && data && ! category ) return <NotFound />;

  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-8'>
      <div className= 'space-y-4'>
        <Link
          to= '/tags'
          className= {
            'inline-flex items-center gap-2 text-sm uppercase text-slate-400 ' +
            'transition-colors hover:text-white'
          }
        >
          <FolderIcon size= { 16 } />
          <span>Category</span>
        </Link>

        <h1 className= 'text-2xl font-light tracking-wide'>
          { category?.name ?? 'Category' }
        </h1>
      </div>

      { error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : (
        <MediaBrowser
          media= { result?.items ?? [] }
          loading= { loading }
          offset= { result?.offset ?? offset }
          limit= { result?.limit ?? MEDIA_PAGE_SIZE }
          total= { result?.total }
          onPageChange= { n => { setOffset( n ), window.scrollTo( 0, 0 ) } }
          onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
        />
      ) }
    </div>
  );
}
