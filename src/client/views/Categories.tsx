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

      { loading ? (
        <Loading size= { 32 } className= 'py-32' />
      ) : error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : items.length > 0 ? (
        <div className= 'divide-y divide-slate-700/70 divide-dashed'>
          { items.map( ( { id, name, parentId } ) => (
            <Link
              key= { id }
              to= { `/category/${ id }` }
              className= {
                'group flex justify-between items-center gap-6 p-4 ' +
                'transition-colors hover:bg-slate-50/5'
              }
            >
              <div className= 'flex items-center gap-4 min-w-0'>
                <FolderIcon size= { 20 } className= 'shrink-0 text-slate-400' />

                <div className= 'min-w-0'>
                  <p className= 'truncate transition-colors group-hover:text-sky-400'>
                    { name }
                  </p>

                  { parentId && parents.has( parentId ) && (
                    <p className= 'mt-1 text-xs text-slate-500'>
                      { parents.get( parentId ) }
                    </p>
                  ) }
                </div>
              </div>

              <span className= 'text-sm text-slate-500'>
                View media
              </span>
            </Link>
          ) ) }
        </div>
      ) : (
        <p className= 'py-16 text-center text-slate-500'>
          No categories found.
        </p>
      ) }
    </div>
  );
}
