import { useEffect, useRef, useState } from 'react';


interface WaveformProps {
  samples: Int16Array | null;
  duration: number;
  currentTime: number;
  buffered: { start: number, end: number }[];
  onSeek: ( time: number ) => void;
}


export function Waveform ( { samples, duration, currentTime, buffered, onSeek }: WaveformProps ) {
  const canvasRef = useRef< HTMLCanvasElement >( null );
  const [ hover, setHover ] = useState< number | null >( null );


  useEffect( () => {
    const canvas = canvasRef.current;
    if ( ! canvas ) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
      const width = Math.max( 1, Math.floor( rect.width * ratio ) );
      const height = Math.max( 1, Math.floor( rect.height * ratio ) );

      if ( canvas.width !== width || canvas.height !== height ) canvas.width = width, canvas.height = height;

      const ctx = canvas.getContext( '2d' );
      if ( ! ctx ) return;

      ctx.clearRect( 0, 0, width, height );
      if ( ! samples?.length || ! duration ) return;

      const count = samples.length / 2, points = Math.min( width, 1200 );
      const center = height / 2, played = currentTime / duration;
      const preview = hover === null ? played : Math.max( played, hover );

      for ( let x = 0; x < points; x++ ) {
        const from = Math.floor( x / points * count );
        const to = Math.min( count, Math.ceil( ( x + 1 ) / points * count ) );
        let peak = 0;

        for ( let i = from; i < to; i++ ) peak = Math.max(
          peak, Math.abs( samples[ i * 2 ] ), Math.abs( samples[ i * 2 + 1 ] )
        );

        const position = x / points, time = position * duration;
        const amplitude = Math.max( 1, peak / 32768 * height );

        ctx.fillStyle = position <= played ? '#0ea5e9' : position <= preview && hover !== null ?
          '#b3c1d3' : buffered.some( r => time >= r.start && time <= r.end ) ? '#8899b0' : '#475569';

        ctx.fillRect(
          Math.floor( position * width ), center - amplitude / 2,
          Math.max( 1, Math.ceil( width / points ) ), amplitude
        );
      }
    };

    const observer = new ResizeObserver( draw );
    observer.observe( canvas );
    draw();

    return () => observer.disconnect();
  }, [ samples, duration, currentTime, buffered, hover ] );


  return (
    <div
      className= 'relative w-full h-20'
      onMouseMove= { e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHover( Math.max( 0, Math.min( 1, ( e.clientX - rect.left ) / rect.width ) ) );
      } }
      onMouseLeave= { () => setHover( null ) }
    >
      <canvas ref= { canvasRef } className= 'size-full pointer-events-none' />

      <input
        type= 'range'
        min= { 0 } max= { duration || 1 } step= { 0.05 }
        value= { Math.min( currentTime, duration || 0 ) }
        onChange= { e => onSeek( Number( e.target.value ) ) }
        disabled= { ! duration }
        aria-label= 'Seek'
        className= 'absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default'
      />
    </div>
  );
}
