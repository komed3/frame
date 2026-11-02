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
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import { formatDuration } from '@/src/client/utils/format';
import { parseWaveform, type WaveformData } from '@/src/client/utils/waveform';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, PauseIcon, PlayIcon,
  RotateCcwIcon, SkipBackIcon, SkipForwardIcon, Volume1Icon, Volume2Icon, VolumeXIcon
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  const { request, adjacentMedia, media: mediaApi, directories, assets } = useApi();
  const navigate = useNavigate();

  const [ waveform, setWaveform ] = useState< WaveformData | null >( null );

  const navigateAdjacent = ( id: string | null ) => id && navigate(
    `/watch/${ id }${ playlistId ? `/${ playlistId }` : '' }`
  );


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< AudioPlayerData >( key, async () => {
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
  const mediaDuration = media.durationMs ? media.durationMs / 1000 : 0;


  const {
    mediaRef, playerRef, volume, muted, currentTime, duration, buffered, playing,
    ended, ready, remaining, fullscreen, streamError, setRemaining, seek, togglePlay,
    changeVolume, saveVolume, toggleMute, toggleFullscreen
  } = useMediaPlayer< HTMLAudioElement >( media, {
    prev, next, onNavigate: navigateAdjacent,
    errorMessage: 'Could not play this audio file.'
  } );


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

    const onTimeUpdate = () => { update(), history.onTimeUpdate( audio.currentTime ) };
    const onPlay = () => { setPlaying( true ), setEnded( false ), history.onPlay( audio.currentTime ) };
    const onPause = () => { setPlaying( false ), history.onPause( audio.currentTime ) };
    const onEnded = () => { setPlaying( false ), setEnded( true ), history.onEnded( audio.currentTime ) };
    const onSeeking = () => history.onSeeking();
    const onSeeked = () => history.onSeeked( audio.currentTime );
    const onReady = () => setReady( true );
    const onError = () => setStreamError( 'Could not play this audio file.' );

    const listeners: [ string, EventListener ][] = [
      [ 'timeupdate', onTimeUpdate ], [ 'durationchange', update ], [ 'progress', update ],
      [ 'play', onPlay ], [ 'pause', onPause ], [ 'ended', onEnded ],
      [ 'seeking', onSeeking ], [ 'seeked', onSeeked ],
      [ 'canplay', onReady ], [ 'error', onError ]
    ];

    listeners.forEach( ( [ e, listener ] ) => audio.addEventListener( e, listener ) );
    return () => listeners.forEach( ( [ e, listener ] ) => audio.removeEventListener( e, listener ) );
  }, [
    history.onPlay, history.onPause, history.onTimeUpdate,
    history.onSeeking, history.onSeeked, history.onEnded
  ] );

  useEffect( () => {
    const audio = audioRef.current;
    if ( ! audio ) return;

    setReady( false ), setPlaying( false ), setEnded( false ), setStreamError( null );
    setCurrentTime( 0 ), setDuration( mediaDuration ), setBuffered( [] );

    restoredRef.current = false;
    audio.src = `/api/stream/${ encodeURIComponent( media.id ) }`;
    audio.load();

    return () => { audio.pause(), audio.removeAttribute( 'src' ), audio.load() };
  }, [ media.id, media.durationMs ] );

  useEffect( () => {
    const audio = audioRef.current;
    if ( ! audio || ! ready || history.positionMs === null || restoredRef.current ) return;
    if ( ! Number.isFinite( audio.duration ) ) return;

    if ( history.positionMs > 0 && history.positionMs < audio.duration * 1000 )
      audio.currentTime = history.positionMs / 1000;

    restoredRef.current = true;
  }, [ ready, history.positionMs ] );

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

  const changeVolume = ( v: number ) => {
    const value = Math.max( 0, Math.min( 1, v ) );
    volumeRef.current = value;
    if ( volumeInputRef.current ) volumeInputRef.current.value = String( value );

    updateVolumeUI( value );
    if ( audioRef.current ) audioRef.current.volume = value;
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
              { ( [ [ prev, ChevronLeftIcon, 'Previous' ], [ next, ChevronRightIcon, 'Next' ] ] as const ).map(
                ( [ id, Icon, label ] ) => (
                  <button
                    key= { label }
                    onClick= { () => navigateAdjacent( id ) }
                    disabled= { ! id }
                    title= { `${ label } [Ctrl + ${ label === 'Previous' ? '←' : '→' }]` }
                    aria-label= { label }
                    className= { BUTTON }
                  >
                    <Icon size= { 20 } />
                  </button>
                )
              ) }

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
                  { title }
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

              <div className= 'flex justify-between items-center gap-12 mt-6'>
                <div className= 'flex items-center gap-2'>
                  <button
                    onClick= { togglePlay }
                    disabled= { ! ready }
                    title= 'Play / Pause [Space]'
                    aria-label= { playing ? 'Pause' : ended ? 'Replay' : 'Play' }
                    className= { BUTTON + ' size-12' }
                  >
                    { playing ? <PauseIcon size= { 22 } /> : ended ? <RotateCcwIcon size= { 22 } /> :
                      <PlayIcon size= { 22 } /> }
                  </button>

                  { ( [ [ -10, SkipBackIcon, 'Back' ], [ 10, SkipForwardIcon, 'Forward' ] ] as const ).map(
                    ( [ offset, Icon, direction ] ) => (
                      <button
                        key= { direction }
                        onClick= { () => seek( currentTime + offset ) }
                        title= { `${ direction } 10 seconds` }
                        aria-label= { `${ direction } 10 seconds` }
                        className= { BUTTON }
                      >
                        <Icon size= { 18 } />
                      </button>
                    )
                  ) }
                </div>

                <div className= 'flex items-center gap-4'>
                  <button
                    onClick= { toggleMute }
                    title= 'Mute / Unmute [m]'
                    aria-label= { muted ? 'Unmute' : 'Mute' }
                    className= 'text-slate-300 transition-colors hover:text-white'
                  >
                    { muted || volume === 0 ? (
                      <VolumeXIcon size= { 20 } />
                    ) : volume < 0.5 ? (
                      <Volume1Icon size= { 20 } />
                    ) : (
                      <Volume2Icon size= { 20 } />
                    ) }
                  </button>

                  <div
                    ref= { volumeControlRef }
                    className= 'relative w-28 h-6 flex items-center'
                    style= { { '--volume': `${ volume * 100 }%` } as CSSProperties }
                  >
                    <div className= 'relative w-full h-1.5 rounded-full bg-slate-700'>
                      <div
                        className= 'h-full rounded-full bg-slate-300'
                        style= { { width: 'var(--volume)' } }
                      />

                      <div
                        className= 'absolute top-1/2 -translate-1/2 size-4 rounded-full bg-white shadow-lg'
                        style= { { left: 'var(--volume)' } }
                      />
                    </div>

                    <input
                      ref= { volumeInputRef } type= 'range'
                      min= { 0 } max= { 1 } step= { 0.01 } defaultValue= { volume }
                      onInput= { e => changeVolume( Number( e.currentTarget.value ) ) }
                      onPointerUp= { saveVolume } onKeyUp= { saveVolume } onBlur= { saveVolume }
                      aria-label= 'Volume' title= 'Volume'
                      className= 'absolute -inset-2 appearance-none bg-transparent opacity-0 cursor-pointer'
                    />
                  </div>
                </div>
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
  );
}
