import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';


interface PaginationProps {
  offset: number;
  limit?: number;
  itemCount: number;
  total?: number;
  hasNext?: boolean;
  onChange: ( offset: number ) => void;
}


export const MEDIA_PAGE_SIZE = 64;


export function Pagination ( { offset, limit = MEDIA_PAGE_SIZE, itemCount, total, hasNext, onChange }: PaginationProps ) {
  const prev = offset > 0;
  const next = hasNext ?? ( total === undefined ? itemCount === limit : offset + itemCount < total );
  const start = itemCount > 0 ? offset + 1 : 0, end = offset + itemCount;

  return prev && next && (
    <nav aria-label= 'Pagination' className= 'flex justify-between items-center gap-4'>
      <span className= 'text-sm text-slate-400'>
        { total === undefined ? `${ start }–${ end }` : `${ start }–${ end } of ${ total }` }
      </span>
    </nav>
  );
}
