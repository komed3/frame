import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { Waveform } from '@/src/client/components/Waveform';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import { formatDuration } from '@/src/client/utils/format';
import { parseWaveform, type WaveformData } from '@/src/client/utils/waveform';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, PauseIcon, PlayIcon,
  SkipBackIcon, SkipForwardIcon, Volume1Icon, Volume2Icon, VolumeXIcon
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}

interface AudioPlayerData {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
  prev: string | null;
  next: string | null;
}


const BUTTON =
  'flex justify-center items-center size-10 rounded-full bg-slate-50/10 transition-colors ' +
  'hover:bg-slate-50/20 disabled:opacity-30 disabled:pointer-events-none';


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  const { request, assets, media: mediaApi, directories, playlists } = useApi();
  const navigate = useNavigate();

  const audioRef = useRef< HTMLAudioElement >( null );
  const playerRef = useRef< HTMLDivElement >( null );
  const volumeRef = useRef( 1 );

  const [ prefs, setPref ] = useUserPrefs( [ 'PLAYER_VOLUME', 'PLAYER_MUTED' ] );
  const volumePref = prefs[ 0 ] as number ?? 1, muted = !! prefs[ 1 ];

  const [ volume, setVolume ] = useState( volumePref );
  const [ waveform, setWaveform ] = useState< WaveformData | null >( null );
  const [ currentTime, setCurrentTime ] = useState( 0 );
  const [ duration, setDuration ] = useState( media.durationMs ? media.durationMs / 1000 : 0 );
  const [ buffered, setBuffered ] = useState< { start: number, end: number }[] >( [] );
  const [ playing, setPlaying ] = useState( false );
  const [ ready, setReady ] = useState( false );
  const [ remaining, setRemaining ] = useState( false );
  const [ streamError, setStreamError ] = useState< string | null >( null );
  const [ fullscreen, setFullscreen ] = useState( false );


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


  useEffect( () => { setVolume( volumePref ), volumeRef.current = volumePref }, [ volumePref ] );
  useEffect( () => { let a = audioRef.current; if ( ! a ) return; a.volume = volume, a.muted = muted }, [ volume, muted ] );

  useEffect( () => {
    const controller = new AbortController();
    let active = true;

    setWaveform( null );

    assets.list( media.id ).then( a => {
      const wave = a.find( i => i.kind === 'wave' && i.variant === 'default' );
      if ( wave && active ) return request< Response >(
        `/assets/${ encodeURIComponent( media.id ) }/wave/${ encodeURIComponent( wave.variant ) }`,
        { signal: controller.signal }
      ).then( response => response.arrayBuffer() );

      return null;
    } ).then( b => { if ( active && b ) setWaveform( parseWaveform( b ) ) } ).catch( () => {} );

    return () => { active = false, controller.abort() };
  }, [ assets, media.id, request ] );

  useEffect( () => {
    const audio = audioRef.current;
    if ( ! audio ) return;

    const update = () => {
      setCurrentTime( audio.currentTime || 0 );
      if ( Number.isFinite( audio.duration ) ) setDuration( audio.duration );

      setBuffered( Array.from( { length: audio.buffered.length }, ( _, i ) => ( {
        start: audio.buffered.start( i ), end: audio.buffered.end( i )
      } ) ) );
    };

    const onPlay = () => setPlaying( true );
    const onPause = () => setPlaying( false );
    const onReady = () => setReady( true );
    const onError = () => setStreamError( 'Could not play this audio file.' );

    audio.addEventListener( 'timeupdate', update );
    audio.addEventListener( 'durationchange', update );
    audio.addEventListener( 'progress', update );
    audio.addEventListener( 'play', onPlay );
    audio.addEventListener( 'pause', onPause );
    audio.addEventListener( 'canplay', onReady );
    audio.addEventListener( 'error', onError );

    return () => {
      audio.removeEventListener( 'timeupdate', update );
      audio.removeEventListener( 'durationchange', update );
      audio.removeEventListener( 'progress', update );
      audio.removeEventListener( 'play', onPlay );
      audio.removeEventListener( 'pause', onPause );
      audio.removeEventListener( 'canplay', onReady );
      audio.removeEventListener( 'error', onError );
    };
  }, [] );

  useEffect( () => {
    const audio = audioRef.current;
    if ( ! audio ) return;

    setReady( false ), setPlaying( false ), setStreamError( null );
    setCurrentTime( 0 ), setDuration( media.durationMs ? media.durationMs / 1000 : 0 );
    setBuffered( [] );

    audio.src = `/api/stream/${ encodeURIComponent( media.id ) }`;
    audio.load();

    return () => { audio.pause(), audio.removeAttribute( 'src' ), audio.load() };
  }, [ media.id, media.durationMs ] );

  useEffect( () => {
    const change = () => setFullscreen( !! document.fullscreenElement );
    document.addEventListener( 'fullscreenchange', change );
    return () => document.removeEventListener( 'fullscreenchange', change );
  }, [] );


  const seek = ( time: number ) => {
    const audio = audioRef.current;
    if ( ! audio || ! Number.isFinite( audio.duration ) ) return;
    audio.currentTime = Math.max( 0, Math.min( audio.duration, time ) );
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if ( ! audio || ! ready ) return;
    if ( audio.paused ) void audio.play().catch( () => {} );
    else audio.pause();
  };

  const changeVolume = ( v: number ) => { volumeRef.current = Math.max( 0, Math.min( 1, v ) ), setVolume( volumeRef.current ) };
  const saveVolume = () => setPref( 'PLAYER_VOLUME', volumeRef.current );
  const toggleMute = () => setPref( 'PLAYER_MUTED', ! muted );
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : playerRef.current?.requestFullscreen();
  const navigateAdjacent = ( id: string | null ) => id && navigate( `/watch/${ id }${ playlistId ? `/${ playlistId }` : '' }` );


  useKeyControls( {
    'f11': toggleFullscreen, ' ': togglePlay, m: toggleMute,
    arrowleft: e => seek( currentTime - ( e.shiftKey ? 10 : 5 ) ),
    arrowright: e => seek( currentTime + ( e.shiftKey ? 10 : 5 ) ),
    arrowup: () => changeVolume( volumeRef.current + 0.05 ),
    arrowdown: () => changeVolume( volumeRef.current - 0.05 ),
    'ctrl+arrowleft': () => navigateAdjacent( prev ),
    'ctrl+arrowright': () => navigateAdjacent( next )
  } );


  const displayDuration = duration || ( media.durationMs ? media.durationMs / 1000 : 0 );
  const timeLabel = remaining
    ? `-${ formatDuration( Math.max( 0, displayDuration - currentTime ) * 1000 ) || '0:00' }`
    : formatDuration( currentTime * 1000 ) || '0:00';


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div
        ref= { playerRef }
        className= 'relative w-full min-h-[72] max-h-[168] aspect-2/1 bg-slate-950 rounded-lg overflow-hidden'
      >
        { loading ? (
          <Loading className= 'h-full' />
        ) : error ? (
          <div className= 'flex justify-center items-center h-full font-semibold text-red-400'>
            { error }
          </div>
        ) : (
          <>
            <MediaThumbnail media= { media } aspectRatio= 'w-full h-full' />

            <div
              className= {
                'absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/30 ' +
                'to-transparent pointer-events-none'
              }
            />

            <div className= 'absolute top-6 right-6 z-20 flex items-center gap-2'>
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
                title= 'Toggle fullscreen [f]'
                aria-label= 'Fullscreen'
                className= { BUTTON }
              >
                { fullscreen ? <Minimize2Icon size= { 20 } /> : <Maximize2Icon size= { 20 } /> }
              </button>
            </div>

            <div className= 'absolute inset-x-0 bottom-0 z-10 p-6 space-y-3'>
              <div className= 'min-w-0 pr-32'>
                <h1 className= 'truncate text-xl font-medium'>
                  { media.title || media.fileName }
                </h1>

                { media.creator && (
                  <p className= 'truncate text-sm text-slate-300'>
                    { media.creator }
                  </p>
                ) }
              </div>

              <Waveform
                samples= { waveform?.samples ?? null }
                duration= { displayDuration }
                currentTime= { currentTime }
                buffered= { buffered }
                onSeek= { seek }
              />

              <div className= 'flex justify-between items-center text-xs text-slate-300 tabular-nums'>
                <button
                  onClick= { () => setRemaining( v => ! v ) }
                  title= 'Switch elapsed / remaining time'
                  className= 'hover:text-white'
                >
                  { timeLabel }
                </button>

                <span>{ formatDuration( displayDuration * 1000 ) }</span>
              </div>
            </div>

            { streamError && (
              <div className= 'absolute inset-x-0 top-24 z-30 flex justify-center px-4'>
                <p role= 'alert' className= 'px-4 py-2 text-sm text-red-300 bg-slate-950/70 rounded'>
                  { streamError }
                </p>
              </div>
            ) }
          </>
        ) }
      </div>

      <audio ref= { audioRef } preload= 'auto' />

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
