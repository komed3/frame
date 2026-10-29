import { useEffect } from 'react';


let lockCount = 0;
let previousOverflow = '';


export function useBodyScrollLock ( locked: boolean ) {
  useEffect( () => {
    if ( ! locked ) return;

    if ( lockCount === 0 ) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    lockCount++;

    return () => { if ( --lockCount === 0 ) document.body.style.overflow = previousOverflow };
  }, [ locked ] );
}
