import { useEffect, useRef } from 'react';
import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react';


interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: ( value: number ) => void;
  onVolumeCommit: () => void;
  onToggleMute: () => void;
  sliderClassName?: string;
}


export function VolumeControl ( {
  volume, muted, onVolumeChange, onVolumeCommit, onToggleMute,
  sliderClassName = 'relative w-28 h-6 flex items-center'
}: VolumeControlProps ) {
  const controlRef = useRef< HTMLDivElement >( null );
  const inputRef = useRef< HTMLInputElement >( null );

  const update = ( value: number ) => controlRef.current?.style.setProperty( '--volume', `${ value * 100 }%` );
}
