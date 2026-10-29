import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import { AudioPlayer } from '@/src/client/views/watch/AudioPlayer';
import { ImageViewer } from '@/src/client/views/watch/ImageViewer';
import { TextViewer } from '@/src/client/views/watch/TextViewer';
import { VideoPlayer } from '@/src/client/views/watch/VideoPlayer';
import type { MediaRecord } from '@/src/shared/types/media';
import { useParams } from 'react-router';


export function Watch () {
  const { media } = useApi();
  const { id } = useParams();

  const { data, loading, error } = useApiData< MediaRecord | null >( id ?? '', () => id
    ? media.get( id ).then( res => res?.available && res.type !== 'other' ? res : null )
    : Promise.resolve( null )
  );

  usePageTitle( data?.title || data?.fileName || 'Watch' );


  if ( ! id ) return <NotFound />;
  if ( loading ) return <Loading className= 'min-h-[50vh]' />;
  if ( error || ! data ) return <NotFound />;

  switch ( data.type ) {
    case 'video': return <VideoPlayer media= { data } />;
    case 'audio': return <AudioPlayer media= { data } />;
    case 'image': return <ImageViewer media= { data } />;
    case 'text': return <TextViewer media= { data } />;

    default: return <NotFound />;
  }
}
