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
  if ( ! prev && ! next ) return null;

  const start = itemCount > 0 ? offset + 1 : 0, end = offset + itemCount;
  const summary = total === undefined ? `${ start }–${ end }` : `${ start }–${ end } of ${ total }`;
}
