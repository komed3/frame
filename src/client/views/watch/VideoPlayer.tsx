import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaActions } from '@/src/client/components/MediaActions';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useNavigate } from 'react-router';


interface VideoPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


export function VideoPlayer ( { media, playlistId }: VideoPlayerProps ) {
  const navigate = useNavigate();


  const directory = [];
  const title = '';


  usePlayHistory( media );


  return (
    <>
      <div className= 'relative h-[calc(100vh-64px)] bg-slate-950 overflow-hidden'>
        <div className= 'absolute left-1/2 -translate-x-1/2 flex flex-col h-full'>
          <div className= 'flex-1 h-[calc(100%-48px)] aspect-video' />
          <div className= 'shrink-0 h-12' />
        </div>
      </div>

      <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
        <MediaActions media= { media } />

        { playlistId && (
          <ActivePlaylist
            playlistId= { playlistId }
            mediaId= { media.id }
            orientation= 'horizontal'
          />
        ) }

        <hr className= 'border-dashed border-slate-700' />

        <Breadcrumbs
          items= { [ ...( directory?.breadcrumbs ?? [] ), { id: media.id, name: title, path: media.path } ] }
          onHome= { () => navigate( '/all' ) }
          onNavigate= { id => navigate( id ? `/all/${ media.rootId }/${ id }` : `/all/${ media.rootId }` ) }
        />
      </div>
    </>
  );
}
