import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';


interface TooltipState {
  text: string;
  x: number;
  y: number;
  above: boolean;
}
