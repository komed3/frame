import { useState } from 'react';


interface VideoSeekbarProps {
  currentTime: number;
  duration: number;
  buffered: { start: number, end: number }[];
  onSeek: ( time: number ) => void;
}


export function VideoSeekbar ( { currentTime, duration, buffered, onSeek }: VideoSeekbarProps ) {
  const [ hovering, setHovering ] = useState< number | null >( null );

  const progress = duration > 0 ? currentTime / duration : 0;
  const preview = hovering === null ? progress : Math.max( progress, hovering );


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

        { hovering !== null && preview > progress && (
          <div
            className= 'absolute top-0 h-full bg-white/40'
            style= { {
              left: `${ progress * 100 }%`,
              width: `${ ( preview - progress ) * 100 }%`
            } }
          />
        ) }

        <div
          className= 'absolute top-0 left-0 h-full bg-sky-500'
          style= { { width: `${ progress * 100 }%` } }
        />
      </div>

      <div
        className= {
          'absolute top-1/2 -translate-1/2 size-3 bg-white rounded-full ' +
          'shadow transition-opacity pointer-events-none'
        }
        style= { {
          left: `${ progress * 100 }%`,
          opacity: hovering !== null ? 1 : 0
        } }
      />

      <input
        type= 'range'
        min= { 0 } max= { duration || 1 } step= { 0.01 }
        value= { Math.min( currentTime, duration || 1 ) }
        onInput= { e => onSeek( Number( e.currentTarget.value ) ) }
        aria-label= 'Seek' title= 'Seek'
        className= {
          'absolute inset-0 z-10 w-full m-0 h-2 appearance-none ' +
          'bg-transparent opacity-0 cursor-pointer'
        }
      />
    </div>
  );
}
