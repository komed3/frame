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


  const { data, loading, error } = useApiData< TagPageData >( key, () => {
    if ( ! id ) return Promise.reject( new Error( 'Tag not found.' ) );

    return Promise.all( [ tags.get( id ), search( {
      tagIds: [ id ], limit: MEDIA_PAGE_SIZE, offset, sortBy: 'title', sortDirection: 'asc'
    } ) ] ).then( ( [ tag, result ] ) => ( { tag, result } ) );
  } );

  const tag = data?.tag ?? null;
  const result = data?.result;


  usePageTitle( tag?.name ?? 'Tag' );


  if ( ! loading && ! error && data && ! tag ) return <NotFound />;
}
