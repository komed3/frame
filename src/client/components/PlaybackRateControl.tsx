import { CircleGaugeIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PBR_VALUES } from '@/src/client/hooks/useMediaPlayer';


interface PlaybackRateControlProps {
  rate: number;
  onChange: ( value: number ) => void;
}


export function PlaybackRateControl ( { rate, onChange }: PlaybackRateControlProps ) {
  const ref = useRef< HTMLDivElement >( null );
  const [ open, setOpen ] = useState( false );


  useEffect( () => {
    if ( ! open ) return;

    const close = ( e: PointerEvent ) => { if ( ! ref.current?.contains( e.target as Node ) ) setOpen( false ) };
    const keydown = ( e: KeyboardEvent ) => { if ( e.key === 'Escape' ) setOpen( false ) };

    document.addEventListener( 'pointerdown', close );
    document.addEventListener( 'keydown', keydown );

    return () => {
      document.removeEventListener( 'pointerdown', close );
      document.removeEventListener( 'keydown', keydown );
    };
  }, [ open ] );


  return (
    <div ref= { ref } className= 'relative'>
      <button
        onClick= { () => setOpen( ! open ) }
        aria-expanded= { open }
        title= 'Playback rate [+ / -]'
        aria-label= 'Playback rate'
        className= {
          'flex justify-center items-center gap-2 w-24 h-10 text-sm tabular-nums ' +
          'bg-slate-50/10 rounded-full transition-colors hover:bg-slate-50/20'
        }
      >
        <CircleGaugeIcon size= { 16 } />
        <span>{ rate.toFixed( 2 ) }</span>
      </button>
    </div>
  );
}
