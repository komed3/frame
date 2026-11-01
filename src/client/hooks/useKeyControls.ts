import { useEffect, useRef } from 'react';


type KeyControls = Record< string, ( e: KeyboardEvent ) => void >;


export function useKeyControls ( controls: KeyControls ) {
  const controlsRef = useRef( controls );
  controlsRef.current = controls;

  useEffect( () => {
    const keydown = ( e: KeyboardEvent ) => {
      const target = e.target;
      const rangeSpace = target instanceof HTMLInputElement && target.type === 'range' && e.key === ' ';

      if ( e.altKey || e.metaKey || ! rangeSpace && target instanceof HTMLElement && (
        [ 'INPUT', 'TEXTAREA', 'SELECT' ].includes( target.tagName ) ||
        target.isContentEditable
      ) ) return;

      const key = `${ e.ctrlKey ? 'ctrl+' : '' }${ e.key.toLowerCase() }`;
      const action = controlsRef.current[ key ];
      if ( ! action ) return;

      e.preventDefault();
      action( e );
    };

    window.addEventListener( 'keydown', keydown );
    return () => window.removeEventListener( 'keydown', keydown );
  }, [] );
}
