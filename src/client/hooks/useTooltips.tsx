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

    const show = ( el: HTMLElement, delay: number ) => {
      const text = el.getAttribute( ATTR );
      if ( ! text ) return;

      if ( activeRef.current === el ) return;
      activeRef.current = el;

      if ( timerRef.current ) clearTimeout( timerRef.current );
      timerRef.current = setTimeout( () => { if ( el.isConnected ) position( el, text ) }, delay );
    };

    const hide = ( e: PointerEvent | FocusEvent ) => {
      const from = e.target instanceof Element ? e.target.closest< HTMLElement >( `[${ ATTR }]` ) : null;
      const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest( `[${ ATTR }]` ) : null;
      if ( ( from && from === to ) || from !== activeRef.current ) return;

      if ( timerRef.current ) clearTimeout( timerRef.current );
      activeRef.current = null, setTooltip( null );
    };

    const onPointerOver = ( e: PointerEvent ) => {
      if ( e.pointerType === 'touch' || ! ( e.target instanceof Element ) ) return;

      const el = e.target.closest< HTMLElement >( `[${ ATTR }]` );
      if ( el ) show( el, 350 );
    };

    const onFocusIn = ( e: FocusEvent ) => {
      if ( ! ( e.target instanceof Element ) ) return;

      const el = e.target.closest< HTMLElement >( `[${ ATTR }]` );
      if ( el ) show( el, 0 );
    };

    const update = () => {
      const el = activeRef.current, text = el?.getAttribute( ATTR );

      if ( el?.isConnected && text ) position( el, text );
      else setTooltip( null );
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
