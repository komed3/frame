import { LayoutGridIcon, Rows3Icon } from 'lucide-react';


export type MediaViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: MediaViewMode;
  onChange: ( value: MediaViewMode ) => void;
}


const BTN = [
  [ 'grid', 'Grid View', LayoutGridIcon ],
  [ 'list', 'List View', Rows3Icon ]
] as const;


export function ViewToggle ( { value, onChange }: ViewToggleProps ) {
  return (
    <div className= 'inline-flex items-center gap-1 p-1 bg-slate-800 rounded'>
      { BTN.map( ( [ option, label, Icon ] ) => (
        <button
          key= { option }
          aria-label= { label }
          aria-pressed= { value === option }
          onClick= { () => onChange( option ) }
          className= {
            'flex justify-center items-center gap-2 h-9 px-3 text-sm rounded transition-colors ' +
            ( value === option ? 'bg-slate-50/20' : '' )
          }
        >
          <Icon size= { 18 } />
          { label }
        </button>
      ) ) }
    </div>
  );
}
