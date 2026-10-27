import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';


export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: ( value: string ) => void;
  placeholder?: string;
}


export function Select ( { label, value, options, onChange, placeholder = 'Select …' }: SelectProps ) {
  const id = useId();
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

  const selected = options.find( o => o.value === value );
}
