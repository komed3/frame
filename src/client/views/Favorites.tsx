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
}
