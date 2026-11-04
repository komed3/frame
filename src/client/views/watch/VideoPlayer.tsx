import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { PlaybackRateControl } from '@/src/client/components/PlaybackRateControl';
import { VideoMarkerControl } from '@/src/client/components/VideoMarkerControl';
import { VideoSeekbar } from '@/src/client/components/VideoSeekbar';
import { VolumeControl } from '@/src/client/components/VolumeControl';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useMediaPlayer } from '@/src/client/hooks/useMediaPlayer';
import { formatDuration } from '@/src/client/utils/format';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ChevronLeftIcon, ChevronRightIcon,
  Maximize2Icon, Minimize2Icon,
  PauseIcon, PlayIcon, RotateCcwIcon, SkipBackIcon, SkipForwardIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';


interface VideoPlayerData {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
  markers: MarkerRecord[];
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
  const { adjacentMedia, media: mediaApi, markers: markersApi, directories } = useApi();
  const navigate = useNavigate();

  const [ markers, setMarkers ] = useState< MarkerRecord[] >( [] );


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< VideoPlayerData >( key, async () => {
    const [ categories, tags, directory, markers, [ prev, next ] ] = await Promise.all( [
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null ),
      markersApi.forMedia( media.id ),
      adjacentMedia( media, playlistId )
    ] );

    return { categories, tags, directory, markers, prev, next };
  } );

  const title = media.title || media.fileName;
  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;
  const markerData = data?.markers ?? [];
  const prev = data?.prev ?? null;
  const next = data?.next ?? null;


  const navigateAdjacent = ( id: string | null ) => id && navigate(
    `/watch/${ id }${ playlistId ? `/${ playlistId }` : '' }`
  );


  const {
    mediaRef, playerRef, volume, muted, rate, currentTime, displayDuration, timeLabel,
    buffered, playing, ended, ready, fullscreen, streamError, setRemaining, seek,
    togglePlay, changeVolume, saveVolume, setPlaybackRate, toggleMute, toggleFullscreen
  } = useMediaPlayer< HTMLVideoElement >( media, { prev, next, onNavigate: navigateAdjacent } );

  useEffect( () => { setMarkers( markerData ?? [] ) }, [ markerData ] );


  const createMarker = async ( positionMs: number, title?: string, description?: string ) => {
    await markersApi.createForMedia( media.id, { positionMs, title, description } );
    setMarkers( await markersApi.forMedia( media.id ) );
  };

  const updateMarker = async ( id: string, data: MarkerUpdate ) => {
    const marker = await markersApi.update( id, data );
    if ( marker ) setMarkers( c => c.map( item => item.id === id ? marker : item ) );
  };

  const deleteMarker = async ( id: string ) => {
    await markersApi.delete( id );
    setMarkers( c => c.filter( marker => marker.id !== id ) );
  };


  return (
    <>
      <div className= 'flex justify-center items-center h-[calc(100vh-64px)] bg-slate-950'>
        <div
          ref= { playerRef }
          className= 'shrink-0 relative flex flex-col max-w-full h-full aspect-video'
        >
          <div className= 'flex-1 relative min-h-0 bg-black'>
            <video
              ref= { mediaRef }
              className= 'block w-full h-full object-contain'
              preload= 'auto'
              playsInline
            />

            { loading || ( ! ready && ! error ) && (
              <div className= 'absolute inset-0 flex justify-center items-center pointer-events-none'>
                <Loading className= 'h-full' />
              </div>
            ) }

            { error || streamError && (
              <div className= 'absolute inset-0 flex justify-center items-center text-red-400'>
                { error ?? streamError }
              </div>
            ) }
          </div>

          <div className= 'shrink-0 flex flex-col h-16'>
            <div className= 'shrink-0 h-1'>
              <VideoSeekbar
                mediaId= { media.id }
                currentTime= { currentTime }
                duration= { displayDuration }
                buffered= { buffered }
                markers= { markers }
                onSeek= { seek }
              />
            </div>

            <div
              className= {
                'shrink-0 flex justify-between items-center h-15 ' +
                ( fullscreen && 'px-2' )
              }
            >
              <div className= 'flex items-center gap-2'>
                <button
                  onClick= { togglePlay }
                  disabled= { ! ready }
                  title= 'Play / Pause [Space]'
                  aria-label= { playing ? 'Pause' : ended ? 'Replay' : 'Play' }
                  className= { BUTTON }
                >
                  { playing ? <PauseIcon size= { 20 } /> : ended
                    ? <RotateCcwIcon size= { 20 } />
                    : <PlayIcon size= { 20 } /> }
                </button>

                { ( [ [ -10, SkipBackIcon, 'Back', '←' ], [ 10, SkipForwardIcon, 'Forward', '→' ] ] as const ).map(
                  ( [ offset, Icon, direction, key ] ) => (
                    <button
                      key= { direction }
                      onClick= { () => seek( currentTime + offset ) }
                      title= { `${ direction } 10 seconds [${key}]` }
                      aria-label= { `${ direction } 10 seconds` }
                      className= { BUTTON }
                    >
                      <Icon size= { 18 } />
                    </button>
                  )
                ) }

                <button
                  onClick= { () => setRemaining( v => ! v ) }
                  title= 'Switch elapsed / remaining time'
                  className= { 
                    'inline-flex items-center gap-2 ml-2 text-xs text-slate-300 tabular-nums ' +
                    'whitespace-nowrap hover:text-white'
                  }
                >
                  <span>{ timeLabel }</span>
                  <span>/</span>
                  <span>{ formatDuration( displayDuration * 1000 ) }</span>
                </button>
              </div>

              <div className= 'flex justify-end items-center gap-2'>
                <VolumeControl
                  volume= { volume }
                  muted= { muted }
                  onVolumeChange= { changeVolume }
                  onVolumeCommit= { saveVolume }
                  onToggleMute= { toggleMute }
                />

                <PlaybackRateControl
                  rate= { rate }
                  onChange= { setPlaybackRate }
                />

                <VideoMarkerControl
                  markers= { markers }
                  currentTime= { currentTime }
                  onSeek= { seek }
                  onCreate= { createMarker }
                  onUpdate= { updateMarker }
                  onDelete= { deleteMarker }
                />

                <button
                  onClick= { () => navigateAdjacent( prev ) }
                  disabled= { ! prev }
                  title= 'Previous [Ctrl + ←]'
                  aria-label= 'Previous'
                  className= { BUTTON }
                >
                  <ChevronLeftIcon size= { 20 } />
                </button>

                <button
                  onClick= { () => navigateAdjacent( next ) }
                  disabled= { ! next }
                  title= 'Next [Ctrl + →]'
                  aria-label= 'Next'
                  className= { BUTTON }
                >
                  <ChevronRightIcon size= { 20 } />
                </button>

                <button
                  onClick= { toggleFullscreen }
                  aria-pressed= { fullscreen }
                  title= 'Toggle fullscreen [F11]'
                  aria-label= 'Fullscreen'
                  className= { BUTTON }
                >
                  { fullscreen
                    ? <Minimize2Icon size= { 20 } />
                    : <Maximize2Icon size= { 20 } /> }
                </button>
              </div>
            </div>
          </div>
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
