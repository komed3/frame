import { useEffect, useRef, useState } from 'react';


interface WaveformProps {
  samples: Int16Array | null;
  duration: number;
  currentTime: number;
  buffered: { start: number, end: number }[];
  onSeek: ( time: number ) => void;
}


export function Waveform ( { samples, duration, currentTime, buffered, onSeek }: WaveformProps ) {
  return (
    <></>
  );
}
