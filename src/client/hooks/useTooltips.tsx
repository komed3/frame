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
  const activeRef = useRef< HTMLElement | null >( null );
  const timerRef = useRef< NodeJS.Timeout | null >( null );

  const [ tooltip, setTooltip ] = useState< TooltipState | null >( null );
  const [ portalTarget, setPortalTarget ] = useState< Element | null >( null );


  useEffect( () => {
    const update = () => setPortalTarget( document.fullscreenElement ?? document.body );
    update();

    document.addEventListener( 'fullscreenchange', update );
    return () => document.removeEventListener( 'fullscreenchange', update );
  }, [] );

  useEffect( () => {
    const migrate = ( el: Element ) => {
      if ( ! el.hasAttribute( 'title' ) ) return;

      el.setAttribute( ATTR, el.getAttribute( 'title' ) ?? '' );
      el.removeAttribute( 'title' );
    };

    const scan = ( el: Element ) => { migrate( el ), el.querySelectorAll( '[title]' ).forEach( migrate ) };

    const observer = new MutationObserver( records => records.forEach( record => {
      if ( record.type === 'attributes' ) migrate( record.target as Element );
      else record.addedNodes.forEach( node => node instanceof Element && scan( node ) );
    } ) );

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


    document.addEventListener( 'pointerover', onPointerOver );
    document.addEventListener( 'pointerout', hide );
    document.addEventListener( 'focusin', onFocusIn );
    document.addEventListener( 'focusout', hide );
    window.addEventListener( 'scroll', update, true );
    window.addEventListener( 'resize', update );

    scan( document.documentElement );
    observer.observe( document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: [ 'title' ]
    } );

    return () => {
      observer.disconnect();
      document.removeEventListener( 'pointerover', onPointerOver );
      document.removeEventListener( 'pointerout', hide );
      document.removeEventListener( 'focusin', onFocusIn );
      document.removeEventListener( 'focusout', hide );
      window.removeEventListener( 'scroll', update, true );
      window.removeEventListener( 'resize', update );
      if ( timerRef.current ) clearTimeout( timerRef.current );
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
