import { type RefObject, useEffect } from 'react';


interface OutsideCloseProps {
  ref: RefObject< HTMLElement | null >;
  open: boolean;
  setOpen: ( open: boolean ) => void;
}


export function useOutsideClose ( { ref, open, setOpen }: OutsideCloseProps ) {
  useEffect( () => {
    if ( ! open ) return;

    const close = ( e: PointerEvent ) => { if ( ! ref.current?.contains( e.target as Node ) ) setOpen( false ) };
    document.addEventListener( 'pointerdown', close );
    return () => document.removeEventListener( 'pointerdown', close );
  }, [ open ] );
}
