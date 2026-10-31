import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useNavigate } from 'react-router';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}

interface AudioPlayerData  {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
  prev: string | null;
  next: string | null;
}


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  const { stream, media: mediaApi, directories, playlists } = useApi();
  const navigate = useNavigate();


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< AudioPlayerData >( key, async () => {
    const [ categories, tags, directory, prev, next ] = await Promise.all( [
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null ),
      playlistId
        ? playlists.prev( playlistId, media.id ).then( item => item?.mediaId ?? null )
        : mediaApi.prev( media.id ).then( item => item?.id ?? null ),
      playlistId
        ? playlists.next( playlistId, media.id ).then( item => item?.mediaId ?? null )
        : mediaApi.next( media.id ).then( item => item?.id ?? null )
    ] );

    return { categories, tags, directory, prev, next };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;
  const prev = data?.prev ?? null;
  const next = data?.next ?? null;


  const navigateAdjacent = ( id: string | null ) => id && navigate(
    `/watch/${ id }${ playlistId ? `/${ playlistId }` : '' }`
  );


  useKeyControls( {
       'ctrl+arrowleft': () => navigateAdjacent( prev ),
       'ctrl+arrowright': () => navigateAdjacent( next )
    } );


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div className= 'relative w-full max-h-130 aspect-2/1 bg-slate-950 rounded-lg overflow-hidden'>
        { loading ? (
          <Loading className= 'h-full' />
        ) : error ? (
          <div className= 'flex justify-center items-center h-full font-semibold text-red-400'>
            { error }
          </div>
        ) : (
          <>
            <MediaThumbnail media= { media } aspectRatio= 'w-full h-full' />

            <button
              onClick= { () => navigateAdjacent( prev ) }
              disabled= { ! prev }
              title= 'Previous [Ctrl + ←]'
              aria-label= 'Previous'
              className= {
                'absolute top-1/2 left-4 -translate-y-1/2 z-20 p-3 bg-slate-50/10 rounded-full ' +
                'backdrop-blur hover:bg-slate-50/20 disabled:opacity-20 disabled:pointer-events-none'
              }
            >
              <ChevronLeftIcon size= { 28 } />
            </button>

            <button
              onClick= { () => navigateAdjacent( next ) }
              disabled= { ! next }
              title= 'Next [Ctrl + →]'
              aria-label= 'Next'
              className= {
                'absolute top-1/2 right-4 -translate-y-1/2 z-20 p-3 bg-slate-50/10 rounded-full ' +
                'backdrop-blur hover:bg-slate-50/20 disabled:opacity-20 disabled:pointer-events-none'
              }
            >
              <ChevronRightIcon size= { 28 } />
            </button>
          </>
        ) }
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

      <hr className= 'border-dashed border-slate-700' />

      <div className= 'space-y-8'>
        <MediaInfo media= { media } />

        { tags.length > 0 && (
          <MediaTaxonomy type= 'tag' items= { tags } />
        ) }
      </div>
    </div>
  );
}
