import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useCallback, useEffect, useRef, useState } from 'react';


export function usePlayHistory ( media: MediaRecord ) {
  const { plays, progress } = useApi();

  const [ positionMs, setPositionMs ] = useState< number | null >( null );
  const playIdRef = useRef< string | null >( null );
  const positionRef = useRef( 0 );
  const watchedMsRef = useRef( 0 );
  const lastTimeRef = useRef< number | null >( null );
  const lastSaveRef = useRef( 0 );
  const playingRef = useRef( false );


  const save = useCallback( ( finish = false, completed = false ) => {
    const id = playIdRef.current;
    if ( ! id ) return;

    const position = Math.max( 0, Math.round( positionRef.current * 1000 ) );
    const watched = Math.round( watchedMsRef.current );

    if ( media.type === 'audio' ) progress.save( media.id, position, completed ).catch( () => {} );

    if ( finish ) plays.finish( id, watched, completed ).catch( () => {} );
    else plays.update( id, watched, completed ).catch( () => {} );

    lastSaveRef.current = Date.now();
  }, [ media.id, media.type, plays, progress ] );
}
