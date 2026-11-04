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
}
