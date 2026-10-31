import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { MediaActions } from '@/src/client/components/MediaActions';
import { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useNavigate } from 'react-router';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { useApi } from '../../context/ApiContext';
import { useApiData } from '../../hooks/useApiData';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div className= 'relative w-full max-h-130 aspect-2/1 bg-slate-950 rounded' />

      <MediaActions media= { media } />

      { playlistId && (
        <ActivePlaylist
          playlistId= { playlistId }
          mediaId= { media.id }
          orientation= 'horizontal'
        />
      ) }

      <hr className= 'border-dashed border-slate-700' />
    </div>
  );
}
