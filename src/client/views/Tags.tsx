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

      { loading ? (
        <Loading size= { 32 } className= 'py-32' />
      ) : error ? (
        <p role= 'alert' className= 'font-semibold text-red-400'>
          { error }
        </p>
      ) : items.length > 0 ? (
        <div className= 'flex flex-wrap gap-3'>
          { items.map( ( { id, name } ) => (
            <Link
              key= { id }
              to= { `/tag/${ id }` }
              className= {
                'inline-flex items-center gap-2 px-4 py-2 text-sm bg-slate-50/10 ' +
                'rounded-full shadow-lg transition-colors hover:bg-slate-50/20'
              }
            >
              <TagIcon size= { 14 } />
              <span>{ name }</span>
            </Link>
          ) ) }
        </div>
      ) : (
        <p className= 'py-16 text-center text-slate-500'>
          No tags found.
        </p>
      ) }
    </div>
  );
}
