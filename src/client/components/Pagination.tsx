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
