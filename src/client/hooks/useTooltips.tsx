import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';


interface TooltipState {
  text: string;
  x: number;
  y: number;
  above: boolean;
}


const ATTR = 'data-frame-tooltip';


export function useTooltips () {
  const [ tooltip, setTooltip ] = useState< TooltipState | null >( null );
  const activeRef = useRef< HTMLElement | null >( null );
  const timerRef = useRef< ReturnType< typeof setTimeout > | null >( null );


  useEffect( () => {
    const migrate = ( el: Element ) => {
      if ( ! el.hasAttribute( 'title' ) ) return;

      el.setAttribute( ATTR, el.getAttribute( 'title' ) ?? '' );
      el.removeAttribute( 'title' );
    };

    const scan = ( el: Element ) => el.querySelectorAll( '[title]' ).forEach( migrate );

    const position = ( el: HTMLElement, text: string ) => {
      const rect = el.getBoundingClientRect();
      const half = Math.min( 128, Math.max( 0, ( window.innerWidth - 16 ) / 2 ) );
      const x = Math.max( 8 + half, Math.min( window.innerWidth - 8 - half, rect.left + rect.width / 2 ) );
      const above = rect.top >= 48;

      setTooltip( { text, x, y: above ? rect.top - 8 : rect.bottom + 8, above } );
    };
  }, [] );


  return tooltip && createPortal(
    <div
      role= 'tooltip'
      className= {
        'fixed z-100 max-w-[min(15rem,calc(100vw-1rem))] px-2 py-1 text-center ' +
        'text-[11px] leading-4 font-medium text-slate-200 bg-slate-800/95 ' +
        'rounded shadow-lg backdrop-blur-sm pointer-events-none'
      }
      style= { {
        transform: tooltip.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        left: tooltip.x, top: tooltip.y
      } }
    >
      { tooltip.text }
    </div>,
    document.body
  );
}
