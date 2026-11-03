import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import { formatDuration } from '@/src/client/utils/format';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useRef, useState } from 'react';


type KeyControls = Record< string, ( e: KeyboardEvent ) => void >;

interface UseMediaPlayerOptions {
  prev?: string | null;
  next?: string | null;
  onNavigate?: ( id: string ) => void;
  extraControls?: KeyControls;
  errorMessage?: string;
}


export const PBR_VALUES = [ 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5 ];


export function useMediaPlayer < T extends HTMLMediaElement > ( media: MediaRecord, {
  prev: previous = null, next = null, onNavigate, extraControls = {}, errorMessage = 'Could not play this media file.'
}: UseMediaPlayerOptions = {} ) {
  const mediaRef = useRef< T >( null );
  const playerRef = useRef< HTMLDivElement >( null );
  const volumeRef = useRef( 1 );
  const pbrRef = useRef( 1 );
  const restoredRef = useRef( false );

  const history = usePlayHistory( media );
  const [ prefs, setPref ] = useUserPrefs( [ 'PLAYER_VOLUME', 'PLAYER_MUTED', 'PLAYER_PLAYBACK_RATE' ] );
  const vol = prefs[ 0 ] as number ?? 1, muted = !! prefs[ 1 ], pbr = prefs[ 2 ] as number ?? 1;

  const mediaDuration = media.durationMs ? media.durationMs / 1000 : 0;

  const [ volume, setVolume ] = useState( vol );
  const [ rate, setRate ] = useState( pbr );
  const [ currentTime, setCurrentTime ] = useState( 0 );
  const [ duration, setDuration ] = useState( mediaDuration );
  const [ buffered, setBuffered ] = useState< { start: number, end: number }[] >( [] );
  const [ playing, setPlaying ] = useState( false );
  const [ ended, setEnded ] = useState( false );
  const [ ready, setReady ] = useState( false );
  const [ remaining, setRemaining ] = useState( false );
  const [ fullscreen, setFullscreen ] = useState( false );
  const [ streamError, setStreamError ] = useState< string | null >( null );


  useEffect( () => { volumeRef.current = vol, setVolume( vol ) }, [ vol ] );
  useEffect( () => { pbrRef.current = pbr, setRate( pbr ) }, [ pbr ] );

  useEffect( () => {
    const el = mediaRef.current;
    if ( ! el ) return;

    el.volume = volume, el.muted = muted, el.playbackRate = rate;
  }, [ muted, volume, rate ] );

  useEffect( () => {
    const el = mediaRef.current;
    if ( ! el ) return;

    const update = () => {
      setCurrentTime( el.currentTime || 0 );
      if ( Number.isFinite( el.duration ) ) setDuration( el.duration );

      setBuffered( Array.from( { length: el.buffered.length }, ( _, i ) => ( {
        start: el.buffered.start( i ), end: el.buffered.end( i )
      } ) ) );
    };

    const onTimeUpdate = () => { update(), history.onTimeUpdate( el.currentTime ) };
    const onPlay = () => { setPlaying( true ), setEnded( false ), history.onPlay( el.currentTime ) };
    const onPause = () => { setPlaying( false ), history.onPause( el.currentTime ) };
    const onEnded = () => { setPlaying( false ), setEnded( true ), history.onEnded( el.currentTime ) };
    const onSeeking = () => history.onSeeking();
    const onSeeked = () => history.onSeeked( el.currentTime );
    const onReady = () => { setReady( true ), update() };
    const onError = () => setStreamError( errorMessage );

    const listeners: [ string, EventListener ][] = [
      [ 'timeupdate', onTimeUpdate ], [ 'durationchange', update ], [ 'progress', update ],
      [ 'play', onPlay ], [ 'pause', onPause ], [ 'ended', onEnded ], [ 'seeking', onSeeking ],
      [ 'seeked', onSeeked ], [ 'loadedmetadata', update ], [ 'canplay', onReady ],
      [ 'error', onError ]
    ];

    listeners.forEach( ( [ e, listener ] ) => el.addEventListener( e, listener ) );
    return () => listeners.forEach( ( [ e, listener ] ) => el.removeEventListener( e, listener ) );
  }, [
    errorMessage, history.onPlay, history.onPause, history.onTimeUpdate,
    history.onSeeking, history.onSeeked, history.onEnded
  ] );

  useEffect( () => {
    const el = mediaRef.current;
    if ( ! el ) return;

    setReady( false ), setPlaying( false ), setEnded( false ), setStreamError( null );
    setCurrentTime( 0 ), setDuration( mediaDuration ), setBuffered( [] );
    setRemaining( false );

    restoredRef.current = false;
    el.src = `/api/stream/${ encodeURIComponent( media.id ) }`;
    el.load();

    return () => { el.pause(), el.removeAttribute( 'src' ), el.load() };
  }, [ media.id, media.durationMs ] );

  useEffect( () => {
    const el = mediaRef.current;
    if ( ! el || ! ready || history.positionMs === null || restoredRef.current ) return;
    if ( ! Number.isFinite( el.duration ) ) return;

    if ( history.positionMs > 0 && history.positionMs < el.duration * 1000 )
      el.currentTime = history.positionMs / 1000;

    restoredRef.current = true;
  }, [ ready, history.positionMs ] );

  useEffect( () => {
    const change = () => setFullscreen( !! document.fullscreenElement );
    document.addEventListener( 'fullscreenchange', change );
    return () => document.removeEventListener( 'fullscreenchange', change );
  }, [] );


  const seek = ( time: number ) => {
    const el = mediaRef.current;
    if ( ! el || ! Number.isFinite( el.duration ) ) return;
    el.currentTime = Math.max( 0, Math.min( el.duration, time ) );
  };

  const frame = ( dir: 'backward' | 'forward' ) => {
    const el = mediaRef.current;
    if ( ! el || ! Number.isFinite( el.duration ) ) return;

    el.pause();

    const frameTime = 1 / ( media.fps ?? 30 );
    seek( dir === 'backward' ? el.currentTime - frameTime : el.currentTime + frameTime );
  };

  const togglePlay = () => {
    const el = mediaRef.current;
    if ( ! el || ! ready ) return;
    if ( el.paused ) void el.play().catch( () => {} );
    else el.pause();
  };

  const setPlaybackRate = ( value: number ) => {
    const next = Math.max( 0.1, Math.min( 5, value ) );
    if ( mediaRef.current ) mediaRef.current.playbackRate = next;
    pbrRef.current = next, setRate( next ), setPref( 'PLAYER_PLAYBACK_RATE', next );
  };

  const adjustPlaybackRate = ( dir: -1 | 1 ) => {
    const next = dir > 0 ? PBR_VALUES.find( v => v > rate ) : PBR_VALUES.toReversed().find( v => v < rate );
    if ( next !== undefined ) setPlaybackRate( next );
  };

  const changeVolume = ( value: number ) => {
    const next = Math.max( 0, Math.min( 1, value ) );

    if ( muted ) {
      if ( mediaRef.current ) mediaRef.current.muted = false;
      setPref( 'PLAYER_MUTED', false );
    }

    if ( mediaRef.current ) mediaRef.current.volume = next;
    volumeRef.current = next;
  };

  const saveVolume = () => {
    if ( volumeRef.current === volume ) return;
    setVolume( volumeRef.current ), setPref( 'PLAYER_VOLUME', volumeRef.current );
  };

  const adjustVolume = ( v: number ) => { changeVolume( v ), saveVolume() };
  const toggleMute = () => setPref( 'PLAYER_MUTED', ! muted );
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() :
    playerRef.current?.requestFullscreen();


  useKeyControls( {
    'f11': toggleFullscreen, ' ': togglePlay, m: toggleMute,
    '0': () => seek( duration * 0 ), '1': () => seek( duration * 0.1 ),
    '2': () => seek( duration * 0.2 ), '3': () => seek( duration * 0.3 ),
    '4': () => seek( duration * 0.4 ), '5': () => seek( duration * 0.5 ),
    '6': () => seek( duration * 0.6 ), '7': () => seek( duration * 0.7 ),
    '8': () => seek( duration * 0.8 ), '9': () => seek( duration * 0.9 ),
    ',': () => frame( 'backward' ), '.': () => frame( 'forward' ),
    '+': () => adjustPlaybackRate( 1 ), '-': () => adjustPlaybackRate( -1 ),
    arrowleft: e => seek( currentTime - ( e.shiftKey ? 10 : 5 ) ),
    arrowright: e => seek( currentTime + ( e.shiftKey ? 10 : 5 ) ),
    arrowup: () => adjustVolume( volumeRef.current + 0.05 ),
    arrowdown: () => adjustVolume( volumeRef.current - 0.05 ),
    'ctrl+arrowleft': () => previous && onNavigate?.( previous ),
    'ctrl+arrowright': () => next && onNavigate?.( next ),
    ...extraControls
  } );


  const displayDuration = duration || mediaDuration;
  const timeLabel = remaining
      ? `-${ formatDuration( Math.max( 0, displayDuration - currentTime ) * 1000 ) }`
      : formatDuration( currentTime * 1000 );


  return {
    mediaRef, playerRef, history, volume, volumeRef, muted, rate, pbrRef, currentTime,
    duration, displayDuration, timeLabel, buffered, playing, ended, ready, remaining,
    fullscreen, streamError, setRemaining, seek, frame, togglePlay, setPlaybackRate,
    changeVolume, saveVolume, toggleMute, toggleFullscreen
  };
}
