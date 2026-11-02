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


  useEffect( () => {
    if ( inputRef.current ) inputRef.current.value = String( volume );
    update( volume );
  }, [ volume ] );


  return (
    <div className= 'flex items-center gap-4'>
      <button
        onClick= { onToggleMute }
        title= 'Mute / Unmute [m]'
        aria-label= { muted ? 'Unmute' : 'Mute' }
        className= 'text-slate-300 transition-colors hover:text-white'
      >
        { muted || volume === 0 ? <VolumeXIcon size= { 20 } /> :
          volume < 0.5 ? <Volume1Icon size= { 20 } /> : <Volume2Icon size= { 20 } /> }
      </button>
    </div>
  );
}
