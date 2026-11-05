import { LayoutGridIcon, Rows3Icon } from 'lucide-react';


export type MediaViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: MediaViewMode;
  onChange: ( value: MediaViewMode ) => void;
}


const BTN = [
  [ 'grid', 'Grid', LayoutGridIcon ],
  [ 'list', 'List', Rows3Icon ]
] as const;


export function ViewToggle ( { value, onChange }: ViewToggleProps ) {
  return (
    <div className= 'inline-flex items-center gap-2'>
      { BTN.map( ( [ option, label, Icon ] ) => (
        <button
          key= { option }
          onClick= { () => onChange( option ) }
          aria-pressed= { value === option }
          title= { `${ label } View` } aria-label= { `${ label } View` }
          className= {
            'flex justify-center items-center gap-2 h-10 min-w-10 rounded shadow-lg transition-colors ' +
            ( value === option ? 'bg-slate-50/20 px-4' : 'bg-slate-50/5 hover:bg-slate-50/10' )
          }
        >
          <Icon size= { 18 } />

          { value === option && (
            <span className= 'text-sm'>{ label }</span>
          ) }
        </button>
      ) ) }
    </div>
  );
}
