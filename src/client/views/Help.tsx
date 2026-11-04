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
  { keys: [ 'm' ], label: 'Toggle mute' },
  { keys: [ '0–9' ], label: 'Seek to 0–90% of the duration' },
  { keys: [ ',', '.' ], label: 'Step backward or forward one frame' },
  { keys: [ '+', '-' ], label: 'Increase or decrease playback speed' },
  { keys: [ 'F11' ], label: 'Toggle fullscreen mode' },
  { keys: [ 'h' ], label: 'Toggle controls in fullscreen mode' }
];

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { keys: [ 'Ctrl + ←' ], label: 'Open previous media' },
  { keys: [ 'Ctrl + →' ], label: 'Open next media' }
];

const PLAYLIST_SHORTCUTS: Shortcut[] = [
  { keys: [ 'p' ], label: 'Play previous playlist item' },
  { keys: [ 'n' ], label: 'Play next playlist item' },
  { keys: [ 'a' ], label: 'Toggle autoplay' },
  { keys: [ 's' ], label: 'Toggle shuffle' },
  { keys: [ 'r' ], label: 'Toggle repeat' }
];

const IMAGE_SHORTCUTS: Shortcut[] = [
  { keys: [ '0' ], label: 'Fit image to screen' },
  { keys: [ 'f' ], label: 'Fill screen with image' },
  { keys: [ '1' ], label: 'Display image at original size (100%)' },
  { keys: [ 'z' ], label: 'Toggle zoom mode' },
  { keys: [ '+' ], label: 'Zoom in' },
  { keys: [ '-' ], label: 'Zoom out' },
  { keys: [ 'm' ], label: 'Toggle magnifier' },
  { keys: [ '[', ']' ], label: 'Change magnification level' },
  { keys: [ '↑', '↓', '←', '→' ], label: 'Pan image in zoom mode' },
  { keys: [ 'Shift + Arrow' ], label: 'Pan image faster' }
];


function ShortcutGroup ( { title, description, shortcuts }: ShortcutGroupProps ) {
  return (
    <div className= 'p-5 bg-slate-50/5 rounded-lg'>
      <div className= 'mb-5 space-y-1'>
        <h2 className= 'font-medium tracking-wide'>
          { title }
        </h2>
      </div>
    </div>
  );
}


export function Help () {
  usePageTitle( 'Help' );

  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Keyboard Shortcuts
      </h1>

      <ShortcutGroup
          title= 'Video playback controls'
          shortcuts= { PLAYER_SHORTCUTS }
        />

      <p className= 'text-xs text-slate-500'>
        Keyboard shortcuts are disabled while typing in input fields.
      </p>
    </div>
  );
}
