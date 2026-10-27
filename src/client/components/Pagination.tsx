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
}
