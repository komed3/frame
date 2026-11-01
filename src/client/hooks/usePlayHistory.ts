import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useCallback, useEffect, useRef, useState } from 'react';


export function usePlayHistory ( media: MediaRecord ) {
  const { plays, progress } = useApi();
  const hasPlayback = media.type === 'audio' || media.type === 'video';

  const [ positionMs, setPositionMs ] = useState< number | null >( null );
  const playId = useRef< string | null >( null );
  const watchedMs = useRef( 0 );
  const position = useRef( 0 );
  const lastTime = useRef< number | null >( null );
  const lastSave = useRef( 0 );
  const playing = useRef( false );


  const save = useCallback( ( finish = false, completed = false ) => {
    const id = playId.current;
    if ( ! id ) return;

    if ( hasPlayback ) {
      if ( completed ) progress.delete( media.id ).catch( () => {} );
      else progress.save( media.id, Math.round( position.current * 1000 ) ).catch( () => {} );
    }

    const update = finish
      ? plays.finish( id, Math.round( watchedMs.current ), completed )
      : plays.update( id, Math.round( watchedMs.current ) );

    update.catch( () => {} );
    lastSave.current = Date.now();

    if ( finish ) playId.current = null;
  }, [ hasPlayback, media.id, plays, progress ] );
}
