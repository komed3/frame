import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { NotFound } from '@/src/client/views/NotFound';
import { AudioPlayer } from '@/src/client/views/watch/AudioPlayer';
import { ImageViewer } from '@/src/client/views/watch/ImageViewer';
import { TextViewer } from '@/src/client/views/watch/TextViewer';
import { VideoPlayer } from '@/src/client/views/watch/VideoPlayer';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';


export function Watch () {
  const { media: mediaApi } = useApi();
  const { id } = useParams();

  const [ media, setMedia ] = useState< MediaRecord | null >( null );
  const [ loading, setLoading ] = useState( true );


  useEffect( () => {
    setMedia( null ), setLoading( true );
    let active = true;

    if ( ! id ) { setLoading( false ); return }

    mediaApi.get( id ).then( res => { if ( active ) setMedia( res?.available && res.type !== 'other' ? res : null ) } )
      .catch( () => { if ( active ) setMedia( null ) } ).finally( () => { if ( active ) setLoading( false ) } );

    return () => { active = false };
  }, [ id, mediaApi ] );


  if ( loading ) return <Loading className= 'min-h-[50vh]' />;
  if ( ! media ) return <NotFound />;

  switch ( media.type ) {
    case 'video': return <VideoPlayer media= { media } />;
    case 'audio': return <AudioPlayer media= { media } />;
    case 'image': return <ImageViewer media= { media } />;
    case 'text': return <TextViewer media= { media } />;

    default: return <NotFound />;
  }
}
