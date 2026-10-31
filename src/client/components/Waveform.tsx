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

    const observer = new ResizeObserver( draw );
    observer.observe( canvas );
    draw();

    return () => observer.disconnect();
  }, [ samples, duration, currentTime, buffered, hover ] );


  return (
    <></>
  );
}
