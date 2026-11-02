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
      </div>
    </div>
  );
}
