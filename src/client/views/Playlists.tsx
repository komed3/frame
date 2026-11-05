import { Loading } from '@/src/client/components/Loading';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDateTime } from '@/src/client/utils/format';
import { ListVideoIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';


export function Playlists () {
  const { playlists } = useApi();
  const [ offset, setOffset ] = useState( 0 );


  const { data, loading, error } = useApiData( String( offset ), () =>
    playlists.list( { limit: MEDIA_PAGE_SIZE, offset } )
  );


  usePageTitle( 'Playlists' );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Playlists
      </h1>
    </div>
  );
}
