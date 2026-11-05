import { ArrowUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';


export function ScrollTopButton () {
  const [ visible, setVisible ] = useState( false );

  useEffect( () => {
    const update = () => setVisible( window.scrollY > 400 );
    window.addEventListener( 'scroll', update, { passive: true } );
    update();

    return () => window.removeEventListener( 'scroll', update );
  }, [] );


  return visible && (
    <button
      onClick= { () => window.scrollTo( 0, 0 ) }
      aria-label= 'Scroll to top'
      className= {
        'fixed right-8 bottom-8 z-99 inline-flex justify-center items-center size-11 ' +
        'bg-slate-700 hover:bg-slate-600 rounded-full shadow-lg transition-colors'
      }
    >
      <ArrowUpIcon size= { 20 } />
    </button>
  );
}
