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
}
