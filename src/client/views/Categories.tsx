import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { FolderIcon } from 'lucide-react';
import { Link } from 'react-router';


interface CategoryNode {
  category: CategoryRecord;
  children: CategoryNode[];
}


function CategoryTree ( { nodes }: { nodes: CategoryNode[] } ) {
  return (
    <ul className= 'space-y-1'>
      { nodes.map( ( { category: { id, name }, children } ) => (
        <li key= { id }>
          <Link
            to= { `/category/${ id }` }
            className= {
              'group flex items-center gap-3 min-w-0 px-3 py-2.5 rounded ' +
              'transition-colors hover:bg-slate-50/5'
            }
          >
            <FolderIcon size= { 16 } className= 'shrink-0' />

            <span className= 'truncate text-sm transition-colors group-hover:text-sky-400'>
              { name }
            </span>
          </Link>

          { children.length > 0 && (
            <div className= 'my-1 ml-5 pl-4 border-l border-slate-700'>
              <CategoryTree nodes= { children } />
            </div>
          ) }
        </li>
      ) ) }
    </ul>
  );
}


export function Categories () {
  const { categories } = useApi();
  const { data, loading, error } = useApiData< CategoryRecord[] >( 'categories', () => categories.list() );

  const items = data ?? [];
  const nodes = new Map< string, CategoryNode >();
  const roots: CategoryNode[] = [];

  items.forEach( c => nodes.set( c.id, { category: c, children: [] } ) );
  items.forEach( c => {
    const node = nodes.get( c.id )!;
    const parent = c.parentId ? nodes.get( c.parentId ) : null;

    if ( parent ) parent.children.push( node );
    else roots.push( node );
  } );

  const sort = ( list: CategoryNode[] ) => {
    list.sort( ( a, b ) => a.category.name.localeCompare( b.category.name ) );
    list.forEach( node => sort( node.children ) );
  };

  sort( roots );


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
      ) : roots.length > 0 ? (
        <CategoryTree nodes= { roots } />
      ) : (
        <p className= 'py-16 text-center text-slate-500'>
          No categories found.
        </p>
      ) }
    </div>
  );
}
