import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { MediaType } from '@/src/shared/types/media';
import type { MediaSearchOptions, MediaSearchProgress, MediaSearchQueryMode, MediaSearchSort } from '@/src/shared/types/search';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';


export function Search () {
  const { search, user } = useApi();
  const navigate = useNavigate();
  const [ searchParams ] = useSearchParams();

  const [ result, setResult ] = useState< Awaited< ReturnType< typeof search > > | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );

  const query = searchParams.get( 'query' ) ?? '';

  usePageTitle( query ? `Search: ${ query }` : 'Search' );
}
