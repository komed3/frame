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


  const delta = ( time: number ) => {
    if ( lastTime.current !== null ) {
      const diff = time - lastTime.current;
      if ( diff > 0 && diff < 3 ) watchedMs.current += diff * 1000;
    }
  };

  const set = ( play: boolean, last: number | null, pos?: number ) => {
    playing.current = play, lastTime.current = last;
    if ( pos !== undefined ) position.current = pos;
  };

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


  useEffect( () => {
    let active = true;

    plays.start( media.id ).then( async res => {
      if ( ! active ) { plays.finish( res.id, 0, false ).catch( () => {} ); return }

      playId.current = res.id, watchedMs.current = res.watchedMs;
      if ( ! hasPlayback ) return;

      const saved = await progress.get( media.id );
      if ( ! active ) return;

      const restored = saved && ! saved.completed ? saved.positionMs : 0;
      position.current = restored / 1000;
      setPositionMs( restored );

      if ( saved?.completed ) progress.delete( media.id ).catch( () => {} );
    } ).catch( () => {} );

    return () => { active = false, save( true ) };
  }, [ media.id, hasPlayback, plays, progress, save ] );


  const onPlay = useCallback( ( time: number ) => set( true, time ), [] );
  const onPause = useCallback( ( time: number ) => { delta( time ), set( false, null, time ), save() }, [ save ] );


  return { positionMs, onPlay, onPause, onTimeUpdate, onSeeking, onSeeked, onEnded };
}
