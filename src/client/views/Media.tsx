import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRoot } from '@/src/shared/types/roots';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';


export function Media () {
  const { directories, roots } = useApi();
  const { rootId, directoryId } = useParams();
  const navigate = useNavigate();

  const [ rootItems, setRootItems ] = useState< MediaRoot[] >( [] );
  const [ result, setResult ] = useState< ApiDirectoryListResult | null >( null );
  const [ offset, setOffset ] = useState( 0 );


  usePageTitle( result?.current?.name ?? result?.root.name ?? 'All Media' );

  useEffect( () => {
    if ( rootId ) directories.list( rootId, directoryId ?? null, { limit: MEDIA_PAGE_SIZE, offset } ).then( setResult );
    else {
      setResult( null ), setOffset( 0 );
      roots.list().then( items => setRootItems( items.filter( root => root.enabled ) ) );
    }
  }, [ rootId, directoryId, offset, directories, roots ] );


  const navigateTo = ( path: string ) => { setOffset( 0 ), navigate( path ) };


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-4'>
      { result && (
        <Breadcrumbs
          items= { result.breadcrumbs }
          onHome= { () => navigateTo( '/all' ) }
          onNavigate= { id => navigateTo( id ? `/all/${ result.root.id }/${ id }` : `/all/${ result.root.id }` ) }
        />
      ) }

      <MediaBrowser
        roots= { rootId ? [] : rootItems }
        directories= { result?.directories ?? [] }
        media= { result?.media ?? [] }
        offset= { offset }
        limit= { MEDIA_PAGE_SIZE }
        hasNext= { ( result?.media.length ?? 0 ) === MEDIA_PAGE_SIZE }
        onPageChange= { offset => { setOffset( offset ), window.scrollTo( 0, 0 ) } }
        onOpenRoot= { ( { id } ) => navigateTo( `/all/${ id }` ) }
        onOpenDirectory= { ( { rootId, id } ) => navigateTo( `/all/${ rootId }/${ id }` ) }
        onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
      />
    </div>
  );
}
