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
}
