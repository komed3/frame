import { LayoutGridIcon, ListIcon } from 'lucide-react';


export type MediaViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: MediaViewMode;
  onChange: ( value: MediaViewMode ) => void;
}
