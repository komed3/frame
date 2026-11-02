import { useApi } from '@/src/client/context/ApiContext';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useRef, useState } from 'react';


type KeyControls = Record< string, ( e: KeyboardEvent ) => void >;

interface UseMediaPlayerOptions {
  previous?: string | null;
  next?: string | null;
  onNavigate?: ( id: string ) => void;
  extraControls?: KeyControls;
  errorMessage?: string;
}


export function useMediaPlayer < T extends HTMLMediaElement > ( media: MediaRecord, {
  previous = null, next = null, onNavigate, extraControls = {},
  errorMessage = 'Could not play this media file.'
}: UseMediaPlayerOptions = {} ) {
  const mediaRef = useRef< T >( null );
  const playerRef = useRef< HTMLDivElement >( null );
  const volumeRef = useRef( 1 );
  const restoredRef = useRef( false );

  const history = usePlayHistory( media );
  const [ prefs, setPref ] = useUserPrefs( [ 'PLAYER_VOLUME', 'PLAYER_MUTED' ] );
  const volumePref = prefs[ 0 ] as number ?? 1, muted = !! prefs[ 1 ];

  const mediaDuration = media.durationMs ? media.durationMs / 1000 : 0;

  const [ volume, setVolume ] = useState( volumePref );
  const [ currentTime, setCurrentTime ] = useState( 0 );
  const [ duration, setDuration ] = useState( mediaDuration );
  const [ buffered, setBuffered ] = useState< { start: number, end: number }[] >( [] );
  const [ playing, setPlaying ] = useState( false );
  const [ ended, setEnded ] = useState( false );
  const [ ready, setReady ] = useState( false );
  const [ remaining, setRemaining ] = useState( false );
  const [ fullscreen, setFullscreen ] = useState( false );
  const [ streamError, setStreamError ] = useState< string | null >( null );


  useEffect( () => { volumeRef.current = volumePref, setVolume( volumePref ) }, [ volumePref ] );

  useEffect( () => {
    const element = mediaRef.current;
    if ( ! element ) return;

    element.volume = volume, element.muted = muted;
  }, [ muted, volume ] );

  useEffect( () => {
    const element = mediaRef.current;
    if ( ! element ) return;

    const update = () => {
      setCurrentTime( element.currentTime || 0 );
      if ( Number.isFinite( element.duration ) ) setDuration( element.duration );

      setBuffered( Array.from( { length: element.buffered.length }, ( _, i ) => ( {
        start: element.buffered.start( i ), end: element.buffered.end( i )
      } ) ) );
    };

    const onTimeUpdate = () => { update(), history.onTimeUpdate( element.currentTime ) };
    const onPlay = () => { setPlaying( true ), setEnded( false ), history.onPlay( element.currentTime ) };
    const onPause = () => { setPlaying( false ), history.onPause( element.currentTime ) };
    const onEnded = () => { setPlaying( false ), setEnded( true ), history.onEnded( element.currentTime ) };
    const onSeeking = () => history.onSeeking();
    const onSeeked = () => history.onSeeked( element.currentTime );
    const onReady = () => { setReady( true ), update() };
    const onError = () => setStreamError( errorMessage );

    const listeners: [ string, EventListener ][] = [
      [ 'timeupdate', onTimeUpdate ], [ 'durationchange', update ], [ 'progress', update ],
      [ 'play', onPlay ], [ 'pause', onPause ], [ 'ended', onEnded ], [ 'seeking', onSeeking ],
      [ 'seeked', onSeeked ], [ 'loadedmetadata', update ], [ 'canplay', onReady ],
      [ 'error', onError ]
    ];

    listeners.forEach( ( [ e, listener ] ) => element.addEventListener( e, listener ) );
    return () => listeners.forEach( ( [ e, listener ] ) => element.removeEventListener( e, listener ) );
  }, [
    errorMessage, history.onPlay, history.onPause, history.onTimeUpdate,
    history.onSeeking, history.onSeeked, history.onEnded
  ] );

  useEffect( () => {
    const element = mediaRef.current;
    if ( ! element ) return;

    setReady( false ), setPlaying( false ), setEnded( false ), setStreamError( null );
    setCurrentTime( 0 ), setDuration( mediaDuration ), setBuffered( [] );
    setRemaining( false );

    restoredRef.current = false;
    element.src = `/api/stream/${ encodeURIComponent( media.id ) }`;
    element.load();

    return () => { element.pause(), element.removeAttribute( 'src' ), element.load() };
  }, [ media.id, media.durationMs ] );

  useEffect( () => {
    const el = mediaRef.current;
    if ( ! el || ! ready || history.positionMs === null || restoredRef.current ) return;
    if ( ! Number.isFinite( el.duration ) ) return;

    if ( history.positionMs > 0 && history.positionMs < el.duration * 1000 ) el.currentTime = history.positionMs / 1000;
    restoredRef.current = true;
  }, [ ready, history.positionMs ] );

  useEffect( () => {
    const change = () => setFullscreen( !! document.fullscreenElement );
    document.addEventListener( 'fullscreenchange', change );
    return () => document.removeEventListener( 'fullscreenchange', change );
  }, [] );


  const seek = ( time: number ) => {
    const element = mediaRef.current;
    if ( ! element || ! Number.isFinite( element.duration ) ) return;
    element.currentTime = Math.max( 0, Math.min( element.duration, time ) );
  };

  const togglePlay = () => {
    const element = mediaRef.current;
    if ( ! element || ! ready ) return;
    if ( element.paused ) void element.play().catch( () => {} );
    else element.pause();
  };

  const changeVolume = ( value: number ) => {
    const next = Math.max( 0, Math.min( 1, value ) );

    if ( mediaRef.current ) mediaRef.current.volume = next;
    volumeRef.current = next;
  };

  const saveVolume = () => {
    if ( volumeRef.current === volume ) return;
    setVolume( volumeRef.current ), setPref( 'PLAYER_VOLUME', volumeRef.current );
  };
}
