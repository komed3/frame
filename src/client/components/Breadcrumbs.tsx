export interface Breadcrumb {
  id: string | null;
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  onNavigate: ( id: string | null ) => void;
}


export function Breadcrumbs ( { items, onNavigate }: BreadcrumbsProps ) {
  return items.length > 0 && (
    <nav aria-label= 'Breadcrumb' className= 'flex items-center gap-3 text-sm'>
      { items.map( ( item, i ) => (
        <span key= { item.id ?? 'root' } className= 'flex items-center gap-3 min-w-0'>
          { i > 0 && <span className= 'text-slate-50/30'>/</span> }

          { i === items.length - 1 ? (
            <span className= 'truncate font-bold'>{ item.name }</span>
          ) : (
            <button
              onClick= { () => onNavigate( item.id ) }
              className= 'truncate text-slate-200 hover:text-white'
            >
              { item.name }
            </button>
          ) }
        </span>
      ) ) }
    </nav>
  );
}
