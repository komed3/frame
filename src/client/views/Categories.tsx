import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { FolderIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Categories () {
  const { categories } = useApi();
  const { data, loading, error } = useApiData< CategoryRecord[] >( 'categories', () => categories.list() );

  const items = data ?? [];
  const parents = new Map( items.map( item => [ item.id, item.name ] ) );


  usePageTitle( 'Categories' );


  return (
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Categories
      </h1>
    </div>
  );
}
