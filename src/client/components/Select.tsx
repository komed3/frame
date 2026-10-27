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


  return (
    <div ref= { ref } className= 'relative min-w-0'>
      <label htmlFor= { id } className= 'block mb-1.5 text-sm text-slate-400'>
        { label }
      </label>

      <button
        id= { id }
        aria-haspopup= 'listbox'
        aria-expanded= { open }
        onClick= { () => setOpen( ! open ) }
        className= {
          'flex justify-between items-center gap-3 w-full h-10 px-3 text-left text-sm bg-slate-800 ' +
          'border border-transparent rounded outline-none transition focus:border-slate-500'
        }
      >
        <span className= 'truncate'>
          { selected?.label ?? placeholder }
        </span>

        <ChevronDownIcon
          size= { 16 }
          className= { 'shrink-0 transition-transform ' + ( open ? 'rotate-180' : '' ) }
        />
      </button>

      { open && (
        <div
          role= 'listbox'
          aria-label= { label }
          className= {
            'absolute top-full left-0 z-110 mt-1 w-full max-h-56 overflow-y-auto bg-slate-800 ' +
            'border border-slate-600 rounded shadow-lg'
          }
        >
          { options.map( option => (
            <button
              key= { option.value }
              role= 'option'
              aria-selected= { option.value === value }
              onClick= { () => { onChange( option.value ), setOpen( false ) } }
              className= {
                'block w-full px-3 py-2 text-left text-sm transition-colors ' +
                ( option.value === value ? 'bg-slate-50/15' : 'hover:bg-slate-50/10' )
              }
            >
              { option.label }
            </button>
          ) ) }
        </div>
      ) }
    </div>
  );
}
