import { PBR_VALUES } from '@/src/client/hooks/useMediaPlayer';
import { useOutsideClose } from '@/src/client/hooks/useOutsideClose';
import { CircleGaugeIcon } from 'lucide-react';
import { useRef, useState } from 'react';


interface PlaybackRateControlProps {
  rate: number;
  onChange: ( value: number ) => void;
  margin?: string;
}


export function PlaybackRateControl ( { rate, onChange, margin = 'mb-4' }: PlaybackRateControlProps ) {
  const ref = useRef< HTMLDivElement >( null );
  const [ open, setOpen ] = useState( false );


  useOutsideClose( { ref, open, setOpen } );


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
        <div className= { `absolute left-1/2 bottom-full -translate-x-1/2 z-20 ${ margin } shadow-lg` }>
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
