import { usePageTitle } from '@/src/client/hooks/usePageTitle';


interface Shortcut {
  keys: string[];
  label: string;
}

interface ShortcutGroupProps {
  title: string;
  description?: string;
  shortcuts: Shortcut[];
}


const PLAYER_SHORTCUTS: Shortcut[] = [
  { keys: [ 'Space' ], label: 'Play or pause playback' },
  { keys: [ '←', '→' ], label: 'Seek backward or forward 5 seconds' },
  { keys: [ 'Shift + ←', 'Shift + →' ], label: 'Seek backward or forward 10 seconds' },
  { keys: [ '↑', '↓' ], label: 'Increase or decrease volume by 5%' },
  { keys: [ 'M' ], label: 'Toggle mute' },
  { keys: [ '0–9' ], label: 'Seek to 0–90% of the duration' },
  { keys: [ ',', '.' ], label: 'Step backward or forward one frame' },
  { keys: [ '+', '-' ], label: 'Increase or decrease playback speed' },
  { keys: [ 'F11' ], label: 'Toggle fullscreen mode' }
];


export function Help () {
  usePageTitle( 'Help' );

  return (
    <></>
  );
}
