import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';


interface TooltipState {
  text: string;
  x: number;
  y: number;
  above: boolean;
}


export function useTooltips () {
  const [ tooltip, setTooltip ] = useState< TooltipState | null >( null );
  const activeRef = useRef< HTMLElement | null >( null );
  const timerRef = useRef< ReturnType< typeof setTimeout > | null >( null );


  useEffect( () => {}, [] );


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
