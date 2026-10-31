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
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        All Tags
      </h1>
    </div>
  );
}
