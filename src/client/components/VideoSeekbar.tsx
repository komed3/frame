import { useEffect, useRef, useState } from 'react';


interface VideoSeekbarProps {
  currentTime: number;
  duration: number;
  buffered: { start: number, end: number }[];
  onSeek: ( time: number ) => void;
}


export function VideoSeekbar ( { currentTime, duration, buffered, onSeek }: VideoSeekbarProps ) {
  const inputRef = useRef< HTMLInputElement >( null );
  const previewRef = useRef< HTMLDivElement >( null );
  const thumbRef = useRef< HTMLDivElement >( null );
  const draggingRef = useRef( false );
  const pendingRef = useRef( currentTime );
  const [ hovering, setHovering ] = useState< number | null >( null );

  const progress = duration > 0 ? currentTime / duration : 0;

  const update = ( time: number ) => {
    const pos = duration > 0 ? time / duration : 0;

    if ( previewRef.current ) {
      previewRef.current.style.left = `${ progress * 100 }%`;
      previewRef.current.style.width = `${ Math.max( 0, pos - progress ) * 100 }%`;
    }

    if ( thumbRef.current ) thumbRef.current.style.left = `${ pos * 100 }%`;
  };

  const commit = () => {
    if ( ! draggingRef.current && pendingRef.current === currentTime ) return;

    draggingRef.current = false;
    onSeek( pendingRef.current );
  };


  useEffect( () => {
    if ( draggingRef.current ) return;

    pendingRef.current = currentTime;
    if ( inputRef.current ) inputRef.current.value = String( currentTime );
    update( currentTime );
  }, [ currentTime, duration ] );


  return (
    <div
      className= 'relative flex items-center w-full h-1'
      onMouseMove= { e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHovering( Math.max( 0, Math.min( 1, ( e.clientX - rect.left ) / rect.width ) ) );
      } }
      onMouseLeave= { () => setHovering( null ) }
    >
      <div className= 'absolute top-1/2 inset-x-0 -translate-y-1/2 h-full bg-slate-700'>
        { buffered.map( ( range, i ) => (
          <div
            key= { i }
            className= 'absolute top-0 h-full bg-slate-500'
            style= { {
              left: `${ range.start / duration * 100 }%`,
              width: `${ ( range.end - range.start ) / duration * 100 }%`
            } }
          />
        ) ) }

        <div ref= { previewRef } className= 'absolute top-0 h-full bg-white/40' />

        <div
          className= 'absolute top-0 left-0 h-full bg-sky-500'
          style= { { width: `${ progress * 100 }%` } }
        />
      </div>

      <div
        ref= { thumbRef }
        className= {
          'absolute top-1/2 -translate-1/2 size-3 bg-white rounded-full ' +
          'shadow transition-opacity pointer-events-none'
        }
        style= { {
          left: `${ progress * 100 }%`,
          opacity: hovering !== null || draggingRef.current ? 1 : 0
        } }
      />

      <input
        ref= { inputRef }
        type= 'range'
        min= { 0 } max= { duration || 1 } step= { 0.01 } defaultValue= { currentTime }
        onPointerDown= { () => { draggingRef.current = true } }
        onInput= { e => {
          pendingRef.current = Number( e.currentTarget.value );
          update( pendingRef.current );
        } }
        onPointerUp= { commit }
        onPointerCancel= { commit }
        onKeyUp= { e => {
          pendingRef.current = Number( e.currentTarget.value );
          commit();
        } }
        onBlur= { commit }
        aria-label= 'Seek' title= 'Seek'
        className= {
          'appearance-none absolute inset-x-0 -inset-y-1 z-10 m-0 ' +
          'w-full h-2 bg-transparent opacity-0 cursor-pointer'
        }
      />
    </div>
  );
}
