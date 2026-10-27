export interface Breadcrumb {
  id: string | null;
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  onNavigate: ( id: string | null ) => void;
}
