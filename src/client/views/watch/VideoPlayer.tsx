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

  useEffect( () => {
    const video = videoRef.current;
    if ( ! video ) return;

    const update = () => {
      setCurrentTime( video.currentTime || 0 );
      if ( Number.isFinite( video.duration ) ) setDuration( video.duration );

      setBuffered( Array.from( { length: video.buffered.length }, ( _, i ) => ( {
        start: video.buffered.start( i ), end: video.buffered.end( i )
      } ) ) );
    };

    const onTimeUpdate = () => { update(), history.onTimeUpdate( video.currentTime ) };
    const onPlay = () => { setPlaying( true ), setEnded( false ), history.onPlay( video.currentTime ) };
    const onPause = () => { setPlaying( false ), history.onPause( video.currentTime ) };
    const onEnded = () => { setPlaying( false ), setEnded( true ), history.onEnded( video.currentTime ) };
    const onSeeking = () => history.onSeeking();
    const onSeeked = () => history.onSeeked( video.currentTime );
    const onReady = () => { setReady( true ), update() };

    const listeners: [ string, EventListener ][] = [
      [ 'timeupdate', onTimeUpdate ], [ 'durationchange', update ], [ 'progress', update ],
      [ 'play', onPlay ], [ 'pause', onPause ], [ 'ended', onEnded ],
      [ 'seeking', onSeeking ], [ 'seeked', onSeeked ],
      [ 'loadedmetadata', update ], [ 'canplay', onReady ]
    ];

    listeners.forEach( ( [ e, listener ] ) => video.addEventListener( e, listener ) );
    return () => listeners.forEach( ( [ e, listener ] ) => video.removeEventListener( e, listener ) );
  }, [
    history.onPlay, history.onPause, history.onTimeUpdate,
    history.onSeeking, history.onSeeked, history.onEnded
  ] );

  useEffect( () => {
    const video = videoRef.current;
    if ( ! video ) return;

    setReady( false ), setPlaying( false ), setEnded( false );
    setCurrentTime( 0 ), setDuration( mediaDuration ), setBuffered( [] );
    setRemaining( false );

    restoredRef.current = false;
    video.src = `/api/stream/${ encodeURIComponent( media.id ) }`;
    video.load();

    return () => { video.pause(), video.removeAttribute( 'src' ), video.load() };
  }, [ media.id, media.durationMs ] );

  useEffect( () => {
    const video = videoRef.current;
    if ( ! video || ! ready || history.positionMs === null || restoredRef.current ) return;
    if ( ! Number.isFinite( video.duration ) ) return;

    if ( history.positionMs > 0 && history.positionMs < video.duration * 1000 )
      video.currentTime = history.positionMs / 1000;

    restoredRef.current = true;
  }, [ ready, history.positionMs ] );

  useEffect( () => {
    const change = () => setFullscreen( !! document.fullscreenElement );
    document.addEventListener( 'fullscreenchange', change );
    return () => document.removeEventListener( 'fullscreenchange', change );
  }, [] );


  const seek = ( time: number ) => {
    const video = videoRef.current;
    if ( ! video || ! Number.isFinite( video.duration ) ) return;
    video.currentTime = Math.max( 0, Math.min( video.duration, time ) );
  };

  const frame = ( dir: 'backward' | 'forward' ) => {
    const video = videoRef.current;
    if ( ! video || ! Number.isFinite( video.duration ) ) return;

    const fps = media.fps ?? 30, frameTime = 1 / fps;
    seek( dir === 'backward' ? video.currentTime - frameTime : video.currentTime + frameTime );
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if ( ! video || ! ready ) return;
    if ( video.paused ) void video.play().catch( () => {} );
    else video.pause();
  };

  const changeVolume = ( value: number ) => {
    const next = Math.max( 0, Math.min( 1, value ) );
    volumeRef.current = next;
    if ( volumeInputRef.current ) volumeInputRef.current.value = String( next );

    updateVolumeUI( next );
    if ( videoRef.current ) videoRef.current.volume = next;
  };

  const saveVolume = () => {
    if ( volumeRef.current === volume ) return;
    setVolume( volumeRef.current ), setPref( 'PLAYER_VOLUME', volumeRef.current );
  };

  const adjustVolume = ( value: number ) => { changeVolume( value ), saveVolume() };
  const toggleMute = () => setPref( 'PLAYER_MUTED', ! muted );
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : playerRef.current?.requestFullscreen();
  const navigateAdjacent = ( id: string | null ) => id && navigate( `/watch/${ id }${ playlistId ? `/${ playlistId }` : '' }` );


  useKeyControls( {
    'f11': toggleFullscreen, ' ': togglePlay, m: toggleMute,
    '0': () => seek( duration * 0 ), '1': () => seek( duration * 0.1 ),
    '2': () => seek( duration * 0.2 ), '3': () => seek( duration * 0.3 ),
    '4': () => seek( duration * 0.4 ), '5': () => seek( duration * 0.5 ),
    '6': () => seek( duration * 0.6 ), '7': () => seek( duration * 0.7 ),
    '8': () => seek( duration * 0.8 ), '9': () => seek( duration * 0.9 ),
    ',': () => frame( 'backward' ), '.': () => frame( 'forward' ),
    arrowleft: e => seek( currentTime - ( e.shiftKey ? 10 : 5 ) ),
    arrowright: e => seek( currentTime + ( e.shiftKey ? 10 : 5 ) ),
    arrowup: () => adjustVolume( volumeRef.current + 0.05 ),
    arrowdown: () => adjustVolume( volumeRef.current - 0.05 ),
    'ctrl+arrowleft': () => navigateAdjacent( prev ),
    'ctrl+arrowright': () => navigateAdjacent( next )
  } );


  const displayDuration = duration || mediaDuration;
  const timeLabel = remaining
    ? `-${ formatDuration( Math.max( 0, displayDuration - currentTime ) * 1000 ) }`
    : formatDuration( currentTime * 1000 );


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
