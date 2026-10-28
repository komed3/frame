import { HouseIcon } from 'lucide-react';


export interface Breadcrumb {
  id: string | null;
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  onHome: () => void;
  onNavigate: ( id: string | null ) => void;
}


export function Breadcrumbs ( { items, onHome, onNavigate }: BreadcrumbsProps ) {
  return items.length > 0 && (
    <nav aria-label= 'Breadcrumb' className= 'flex items-center gap-3 text-sm'>
      <button
        aria-label= 'All media'
        onClick= { onHome }
        className= 'shrink-0 text-slate-300 hover:text-white'
      >
        <HouseIcon size= { 18 } />
      </button>

      { items.map( ( item, i ) => (
        <span key= { item.id ?? 'root' } className= 'flex items-center gap-3 min-w-0'>
          <span className= 'text-slate-50/30'>/</span>

          { i === items.length - 1 ? (
            <span className= 'truncate font-bold'>{ item.name }</span>
          ) : (
            <button
              onClick= { () => onNavigate( item.id ) }
              className= 'truncate text-slate-300 hover:text-white'
            >
              { item.name }
            </button>
          ) }
        </span>
      ) ) }
    </nav>
  );
}
