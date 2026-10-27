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
    <nav aria-label= 'Breadcrumb' className= 'flex items-center gap-2 text-sm text-slate-400'>
      { items.map( ( item, i ) => (
        <></>
      ) ) }
    </nav>
  );
}
