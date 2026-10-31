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


  return (
    <></>
  );
}
