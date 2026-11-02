import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';


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

      <div
        ref= { controlRef }
        className= { sliderClassName }
        style= { { '--volume': `${ volume * 100 }%` } as React.CSSProperties }
      >
        <div className= 'relative w-full h-1.5 bg-slate-700 rounded-full'>
          <div
            className= 'h-full bg-slate-300 rounded-full'
            style= { { width: 'var(--volume)' } }
          />

          <div
            className= 'absolute top-1/2 -translate-1/2 size-4 bg-white rounded-full shadow-lg'
            style= { { left: 'var(--volume)' } }
          />
        </div>

        <input
          ref= { inputRef }
          type= 'range'
          min= { 0 } max= { 1 } step= { 0.01 } defaultValue= { volume }
          onInput= { e => {
            const value = Number( e.currentTarget.value );
            update( value ), onVolumeChange( value );
          } }
          onPointerUp= { onVolumeCommit } onKeyUp= { onVolumeCommit } onBlur= { onVolumeCommit }
          aria-label= 'Volume' title= 'Volume'
          className= 'appearance-none absolute -inset-2 bg-transparent opacity-0 cursor-pointer'
        />
      </div>
    </div>
  );
}
