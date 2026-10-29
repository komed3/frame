import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRoot } from '@/src/shared/types/roots';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';


interface MediaPageData {
  roots: MediaRoot[];
  result: ApiDirectoryListResult | null;
}


export function Media () {
  const { directories, roots } = useApi();
  const { rootId, directoryId } = useParams();
  const navigate = useNavigate();

  const [ offset, setOffset ] = useState( 0 );
  const pageOffset = rootId ? offset : 0;
  const key = JSON.stringify( [ rootId ?? null, directoryId ?? null, pageOffset ] );

  const { data, loading } = useApiData< MediaPageData >( key, () => rootId
    ? directories.list( rootId, directoryId ?? null, { limit: MEDIA_PAGE_SIZE, offset: pageOffset } )
      .then( result => ( { roots: [], result } ) )
    : roots.list().then( items => ( { roots: items.filter( root => root.enabled ), result: null } ) )
  );

  const rootItems = data?.roots ?? [];
  const result = data?.result ?? null;

  usePageTitle( result?.current?.name ?? result?.root.name ?? 'All Media' );


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
        loading= { loading }
        offset= { pageOffset }
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
