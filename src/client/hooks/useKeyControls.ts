import { useEffect, useRef } from 'react';


type KeyControls = Record< string, ( e: KeyboardEvent ) => void >;


export function useKeyControls ( controls: KeyControls ) {
  const controlsRef = useRef( controls );
  controlsRef.current = controls;

  useEffect( () => {
    const keydown = ( e: KeyboardEvent ) => {
      if ( e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLElement && (
        [ 'INPUT', 'TEXTAREA', 'SELECT' ].includes( e.target.tagName ) ||
        e.target.isContentEditable
      ) ) return;

      const action = controlsRef.current[ e.key.toLowerCase() ];
      if ( ! action ) return;

      e.preventDefault();
      action( e );
    };

    window.addEventListener( 'keydown', keydown );
    return () => window.removeEventListener( 'keydown', keydown );
  }, [] );
}
