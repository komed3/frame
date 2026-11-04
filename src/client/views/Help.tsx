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


export function Help () {
  usePageTitle( 'Help' );

  return (
    <></>
  );
}
