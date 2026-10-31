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
    };

    const observer = new ResizeObserver( draw );
    observer.observe( canvas );
    draw();

    return () => observer.disconnect();
  }, [ samples, duration, currentTime, buffered, hover ] );


  return (
    <></>
  );
}
