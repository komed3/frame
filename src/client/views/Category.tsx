import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { TaxonomyActions } from '@/src/client/components/TaxonomyActions';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaSearchResult } from '@/src/shared/types/search';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';


interface CategoryPageData {
  category: CategoryRecord | null;
  categories: CategoryRecord[];
  result: MediaSearchResult;
}


export function Category () {
  const { categories, search } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  const [ offset, setOffset ] = useState( 0 );
  const [ nameOverride, setNameOverride ] = useState< string | null >( null );
  const key = JSON.stringify( [ id ?? null, offset ] );


  const { data, loading, error } = useApiData< CategoryPageData >( key, async () => {
    if ( ! id ) return Promise.reject( new Error( 'Category not found.' ) );

    const [ category, allCategories, result ] = await Promise.all( [
      categories.get( id ), categories.list(), search( {
        categoryIds: [ id ], limit: MEDIA_PAGE_SIZE, offset, sortBy: 'title', sortDirection: 'asc'
      } )
    ] );

    return { category, categories: allCategories, result };
  } );

  const category = data?.category ?? null;
  const result = data?.result;
  const name = nameOverride ?? category?.name ?? 'Category';

  const parents: CategoryRecord[] = [];
  let current = category;

  while ( current ) {
    parents.unshift( current );
    current = current.parentId ? data?.categories.find( item => item.id === current?.parentId ) ?? null : null;
  }


  usePageTitle( name );


  if ( ! loading && ! error && data && ! category ) return <NotFound />;

  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-8'>
      <div className= 'space-y-4'>
        <Breadcrumbs
          items= { parents.map( ( item, i ) => ( {
            id: item.id, name: i === parents.length - 1 ? name : item.name, path: ''
          } ) ) }
          onHome= { () => navigate( '/categories' ) }
          onNavigate= { p => navigate( p ? `/category/${ p }` : '/categories' ) }
        />

        <div className= 'flex justify-between items-center gap-12'>
          <h1 className= 'text-2xl font-light tracking-wide'>
            { name }
          </h1>

          { category && (
            <TaxonomyActions
              kind= 'category'
              id= { category.id }
              parentId= { category.parentId }
              name= { name }
              onRename= { async next => {
                await categories.rename( category.id, next );
                setNameOverride( next );
              } }
              onDelete= { async () => {
                await categories.delete( category.id );
                navigate( '/categories' );
              } }
              onSwap= { async () => {
                const tag = await categories.swap( category.id );
                if ( ! tag ) throw new Error( 'Could not convert category.' );
                navigate( `/tag/${ tag.id }` );
              } }
            />
          ) }
        </div>
      </div>

      { error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : (
        <MediaBrowser
          media= { result?.items ?? [] }
          loading= { loading }
          offset= { result?.offset ?? offset }
          limit= { result?.limit ?? MEDIA_PAGE_SIZE }
          total= { result?.total }
          onPageChange= { n => { setOffset( n ), window.scrollTo( 0, 0 ) } }
          onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
        />
      ) }
    </div>
  );
}
