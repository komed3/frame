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
}
