import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';


export function Media () {
  const { directories, media, roots } = useApi();
  const { rootId, directoryId } = useParams();
  const navigate = useNavigate();

  const [ result, setResult ] = useState< Awaited< ReturnType< typeof directories.list > > | null >( null );
  const [ items, setItems ] = useState< Awaited< ReturnType< typeof media.list > > >( [] );
  const [ offset, setOffset ] = useState( 0 );


  usePageTitle( result?.current?.name ?? result?.root.name ?? 'All Media' );

  useEffect( () => {
    if ( rootId ) directories.list( rootId, directoryId ?? null, { limit: MEDIA_PAGE_SIZE, offset } ).then( setResult );
    else Promise.all( [
      roots.list().then( roots => Promise.all( roots.filter( root => root.enabled ).map( root =>
        directories.list( root.id, null, { limit: 1, offset: 0 } )
      ) ) ),
      media.list( { limit: MEDIA_PAGE_SIZE, offset, availableOnly: true } )
    ] ).then( ( [ , items ] ) => { setResult( null ), setItems( items ) } );
  }, [ rootId, directoryId, offset, directories, media, roots ] );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-4'>
      { result && (
        <Breadcrumbs
          onNavigate= { id => navigate( id ? `/all/${ result.root.id }/${ id }` : `/all/${ result.root.id }` ) }
          items= { result.breadcrumbs }
        />
      ) }

      <MediaBrowser
        directories= { result?.directories ?? [] }
        media= { result?.media ?? items }
        offset= { offset }
        total= { result?.media.length ?? items.length }
        onPageChange= { setOffset }
        onOpenDirectory= { ( { rootId, id } ) => navigate( `/all/${ rootId }/${ id }` ) }
        onOpenMedia= { ( { id } ) => navigate( `/watch/${ id }` ) }
      />
    </div>
  );
}
