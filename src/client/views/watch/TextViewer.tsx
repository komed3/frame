import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { useApi } from '@/src/client/context/ApiContext';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';


export function TextViewer ( { media }: { media: MediaRecord } ) {
  const { stream, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();

  const [ content, setContent ] = useState( '' );
  const [ categories, setCategories ] = useState< CategoryRecord[] >( [] );
  const [ tags, setTags ] = useState< TagRecord[] >( [] );
  const [ directory, setDirectory ] = useState< ApiDirectoryListResult | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );


  useEffect( () => {
    const controller = new AbortController();
    let active = true;

    setLoading( true ), setError( null ), setContent( '' );

    Promise.all( [
      stream( media.id, { signal: controller.signal } ).then( res => res.text() ),
      mediaApi.categories( media.id ).catch( () => [] ), mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] ).then( ( [ content, categories, tags, directory ] ) => {
      if ( ! active ) return;

      setContent( content ), setCategories( categories );
      setTags( tags ), setDirectory( directory );
    } ).catch( err => {
      if ( active && ! controller.signal.aborted ) setError( err instanceof Error ? err.message : 'Unable to load text.' )
    } ).finally( () => { if ( active ) setLoading( false ) } );

    return () => { active = false; controller.abort() };
  }, [ media.id, media.rootId, media.directoryId, stream, mediaApi, directories ] );


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-6'>
      <Breadcrumbs
        items= { directory?.breadcrumbs ?? [] }
        onHome= { () => navigate( '/all' ) }
        onNavigate= { id => navigate( id ? `/all/${ media.rootId }/${ id }` : `/all/${ media.rootId }` ) }
      />
    </div>
  );
}
