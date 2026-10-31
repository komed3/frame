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
    <></>
  );
}
