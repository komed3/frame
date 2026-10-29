import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
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
  const [ error, setError ] = useState< string | null >( null );


  useEffect( () => {
    const controller = new AbortController();
    let active = true;

    setError( null ), setContent( '' );

    Promise.all( [
      '' /*stream( media.id, { signal: controller.signal } ).then( res => res.text() )*/,
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] ).then( ( [ content, categories, tags, directory ] ) => {
      if ( ! active ) return;

      setContent( content ), setCategories( categories );
      setTags( tags ), setDirectory( directory );
    } ).catch( err => {
      if ( active && ! controller.signal.aborted ) setError( err instanceof Error ? err.message : 'Unable to load text.' )
    } );

    return () => { active = false; controller.abort() };
  }, [ media.id, media.rootId, media.directoryId, stream, mediaApi, directories ] );

  usePageTitle( media.title || media.fileName );

  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <Breadcrumbs
        items= { directory?.breadcrumbs ?? [] }
        onHome= { () => navigate( '/all' ) }
        onNavigate= { id => navigate( id ? `/all/${ media.rootId }/${ id }` : `/all/${ media.rootId }` ) }
      />

      <div className= 'space-y-3'>
        { categories.length > 0 && (
          <MediaTaxonomy type= 'category' items= { categories } />
        ) }

        <h1 className= 'text-2xl font-medium tracking-wide'>
          { media.title || media.fileName }
        </h1>
      </div>

      <div className= 'border-t border-slate-700 pt-6 space-y-8'>
        <MediaActions media= { media } />
        <MediaInfo media= { media } />

        { media.description && (
          <p className= 'max-w-3xl text-lg leading-relaxed'>
            { media.description }
          </p>
        ) }

        { tags.length > 0 && (
          <MediaTaxonomy type= 'tag' items= { tags } />
        ) }
      </div>
    </div>
  );
}
