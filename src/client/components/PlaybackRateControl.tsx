import { PBR_VALUES } from '@/src/client/hooks/useMediaPlayer';
import { CircleGaugeIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';


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
          'flex justify-center items-center gap-2 w-24 h-10 text-sm tabular-nums bg-slate-50/10 ' +
          'rounded-full transition-colors ' + ( open ? 'bg-slate-50/30' : 'hover:bg-slate-50/20' )
        }
      >
        <CircleGaugeIcon size= { 16 } />
        <span>{ rate.toFixed( 2 ) }</span>
      </button>

      { open && (
        <div className= 'absolute left-1/2 bottom-full -translate-x-1/2 z-20 mb-4 shadow-lg'>
          <div className= 'absolute left-1/2 -bottom-1.5 -translate-x-1/2 rotate-45 size-3 bg-slate-700' />

          <div className= 'relative z-1 w-24 py-2 bg-slate-700 rounded'>
            { PBR_VALUES.map( value => (
              <button
                key= { value }
                onClick= { () => { onChange( value ); setOpen( false ) } }
                aria-pressed= { rate === value }
                className= {
                  'block w-full px-3 py-2 text-sm text-center tabular-nums transition-colors ' +
                  ( rate === value ? 'bg-slate-50/20' : 'hover:bg-slate-50/10' )
                }
              >
                { value.toFixed( 2 ) }
              </button>
            ) ) }
          </div>
        </div>
      ) }
    </div>
  );
}
