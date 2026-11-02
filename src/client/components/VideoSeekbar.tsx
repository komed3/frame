import { useState } from 'react';


interface VideoSeekbarProps {
  currentTime: number;
  duration: number;
  buffered: { start: number, end: number }[];
  onSeek: ( time: number ) => void;
}


export function VideoSeekbar ( { currentTime, duration, buffered, onSeek }: VideoSeekbarProps ) {
  return (
    <></>
  );
}
