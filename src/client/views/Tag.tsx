import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaSearchResult } from '@/src/shared/types/search';
import type { TagRecord } from '@/src/shared/types/taxonomy';
import { TagIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


interface TagPageData {
  tag: TagRecord | null;
  result: MediaSearchResult;
}


export function Tag () {
  const { tags, search } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  const [ offset, setOffset ] = useState( 0 );
  const key = JSON.stringify( [ id ?? null, offset ] );


  const { data, loading, error } = useApiData< TagPageData >( key, async () => {
    if ( ! id ) return Promise.reject( new Error( 'Tag not found.' ) );

    return Promise.all( [ tags.get( id ), search( {
      tagIds: [ id ], limit: MEDIA_PAGE_SIZE, offset, sortBy: 'title', sortDirection: 'asc'
    } ) ] ).then( ( [ tag, result ] ) => ( { tag, result } ) );
  } );

  const tag = data?.tag ?? null;
  const result = data?.result;


  usePageTitle( tag?.name ?? 'Tag' );


  if ( ! loading && ! error && data && ! tag ) return <NotFound />;


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
          <TagIcon size= { 16 } />
          <span>Tag</span>
        </Link>

        <h1 className= 'text-2xl font-light tracking-wide'>
          { tag?.name ?? 'Tag' }
        </h1>
      </div>

      { error ? (
        <p className= 'py-16 text-center text-red-400'>{ error }</p>
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
