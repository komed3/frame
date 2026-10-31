import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useNavigate } from 'react-router';
import { MediaInfo } from '../../components/MediaInfo';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}

interface AudioPlayerData  {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
}


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  const { stream, media: mediaApi, directories, playlists } = useApi();
  const navigate = useNavigate();


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< AudioPlayerData >( key, async () => {
    const [ categories, tags, directory ] = await Promise.all( [
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] );

  return { categories, tags, directory };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div className= 'relative w-full max-h-130 aspect-2/1 bg-slate-950 rounded-lg overflow-hidden'>
        <MediaThumbnail media= { media } aspectRatio= 'w-full h-full' />
      </div>

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
        items= { [ ...( directory?.breadcrumbs ?? [] ), {
          id: media.id, name: media.title || media.fileName, path: media.path
        } ] }
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

      { media.description && (
        <p className= 'max-w-3xl text-lg leading-relaxed'>
          { media.description }
        </p>
      ) }
    </div>
  );
}
