import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { TagRecord } from '@/src/shared/types/taxonomy';
import { TagIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Tags () {
  const { tags } = useApi();
  const { data, loading, error } = useApiData< TagRecord[] >( 'tags', () => tags.list() );
  const items = [ ...( data ?? [] ) ].sort( ( a, b ) => a.name.localeCompare( b.name ) );


  usePageTitle( 'Tags' );


  return (
    <></>
  );
}
