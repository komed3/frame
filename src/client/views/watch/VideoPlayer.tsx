import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { VideoSeekbar } from '@/src/client/components/VideoSeekbar';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import { formatDuration } from '@/src/client/utils/format';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, PauseIcon, PlayIcon,
  RotateCcwIcon, SkipBackIcon, SkipForwardIcon, Volume1Icon, Volume2Icon, VolumeXIcon
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';


interface VideoPlayerData {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
  prev: string | null;
  next: string | null;
}

interface VideoPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


const BUTTON =
  'flex justify-center items-center size-10 bg-slate-50/10 rounded-full transition-colors ' +
  'hover:bg-slate-50/20 disabled:opacity-30 disabled:pointer-events-none';


export function VideoPlayer ( { media, playlistId }: VideoPlayerProps ) {
  const { adjacentMedia, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();
  const history = usePlayHistory( media );

  const videoRef = useRef< HTMLVideoElement >( null );
  const playerRef = useRef< HTMLDivElement >( null );
  const volumeControlRef = useRef< HTMLDivElement >( null );
  const volumeInputRef = useRef< HTMLInputElement >( null );
  const volumeRef = useRef( 1 );
  const restoredRef = useRef( false );

  const [ prefs, setPref ] = useUserPrefs( [ 'PLAYER_VOLUME', 'PLAYER_MUTED' ] );
  const volumePref = prefs[ 0 ] as number ?? 1, muted = !! prefs[ 1 ];
  const mediaDuration = media.durationMs ? media.durationMs / 1000 : 0;
  const title = media.title || media.fileName;

  const [ volume, setVolume ] = useState( volumePref );
  const [ currentTime, setCurrentTime ] = useState( 0 );
  const [ duration, setDuration ] = useState( mediaDuration );
  const [ buffered, setBuffered ] = useState< { start: number, end: number }[] >( [] );
  const [ playing, setPlaying ] = useState( false );
  const [ ended, setEnded ] = useState( false );
  const [ ready, setReady ] = useState( false );
  const [ remaining, setRemaining ] = useState( false );
  const [ fullscreen, setFullscreen ] = useState( false );


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< VideoPlayerData >( key, async () => {
    const [ categories, tags, directory, [ prev, next ] ] = await Promise.all( [
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null ),
      adjacentMedia( media, playlistId )
    ] );

    return { categories, tags, directory, prev, next };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;
  const prev = data?.prev ?? null;
  const next = data?.next ?? null;


  function updateVolumeUI ( value: number ) {
    volumeControlRef.current?.style.setProperty( '--volume', `${ value * 100 }%` );
  }


  useEffect( () => {
    setVolume( volumePref ), volumeRef.current = volumePref;
    if ( volumeInputRef.current ) volumeInputRef.current.value = String( volumePref );

    updateVolumeUI( volumePref );
  }, [ volumePref ] );

  useEffect( () => {
    const video = videoRef.current;
    if ( ! video ) return;

    video.volume = volume, video.muted = muted;
  }, [ muted, volume ] );


  return (
    <>
      <div className= 'relative h-[calc(100vh-64px)] bg-slate-950 overflow-hidden'>
        { loading ? (
          <Loading className= 'h-full' />
        ) : error ? (
          <div className= 'flex justify-center items-center h-full font-semibold text-red-400'>
            { error }
          </div>
        ) : (
          <div className= 'absolute left-1/2 -translate-x-1/2 flex flex-col h-full'>
            <div className= 'flex-1 h-[calc(100%-48px)] aspect-video' />
            <div className= 'shrink-0 h-12' />
          </div>
        ) }
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

        <div className= 'space-y-3'>
          { categories.length > 0 && (
            <MediaTaxonomy type= 'category' items= { categories } />
          ) }

          <h1 className= 'text-2xl font-medium tracking-wide'>
            { title }
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
    </>
  );
}
