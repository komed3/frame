import { MediaIcon } from '@/src/client/components/MediaIcon';
import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useState } from 'react';


export function MediaThumbnail ( { media }: { media: MediaRecord } ) {
  const { request } = useApi();
  const [ src, setSrc ] = useState< string | null >( null );

  useEffect( () => {
    if ( ! [ 'video', 'audio', 'image' ].includes( media.type ) ) return setSrc( null );

    let active = true, objectUrl: string | null = null;
    const controller = new AbortController();

    request< Response >( `/assets/${ encodeURIComponent( media.id ) }/thumb/default`, {
      signal: controller.signal
    } ).then( response => response.blob() ).then( blob => {
      if ( ! active ) return;

      objectUrl = URL.createObjectURL( blob );
      setSrc( objectUrl );
    } ).catch( () => {} );

    return () => {
      active = false;
      controller.abort();
      if ( objectUrl ) URL.revokeObjectURL( objectUrl );
    };
  }, [ media.id, media.type, request ] );

  return (
    <div className= 'flex justify-center items-center aspect-video overflow-hidden bg-slate-800 rounded'>
      { src ? (
        <img
          src= { src }
          alt= ''
          loading= 'lazy'
          className= 'w-full h-full object-cover'
        />
      ) : (
        <MediaIcon type= { media.type } />
      ) }
    </div>
  );
}
