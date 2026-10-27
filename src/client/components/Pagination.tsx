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


  return ( prev || next ) && (
    <nav aria-label= 'Pagination' className= 'flex justify-between items-center gap-4'>
      <div className= 'w-60'>
        <button
          aria-label= 'Previous page'
          disabled= { ! prev }
          onClick= { () => onChange( Math.max( 0, offset - limit ) ) }
          className= {
            'inline-flex justify-center items-center gap-2 h-10 pl-2 pr-3.5 text-sm bg-slate-50/10 rounded ' +
            'transition-colors hover:bg-slate-50/20 disabled:pointer-events-none disabled:opacity-40'
          }
        >
          <ChevronLeftIcon size= { 20 } />
          <span>Previous</span>
        </button>
      </div>

      <span className= 'text-sm text-slate-400'>
        { total === undefined ? `${ start }–${ end }` : `${ start }–${ end } of ${ total }` }
      </span>

      <div className= 'w-60 text-right'>
        <button
          aria-label= 'Next page'
          disabled= { ! next }
          onClick= { () => onChange( offset + limit ) }
          className= {
            'inline-flex justify-center items-center gap-2 h-10 pl-3.5 pr-2 text-sm bg-slate-50/10 rounded ' +
            'transition-colors hover:bg-slate-50/20 disabled:pointer-events-none disabled:opacity-40'
          }
        >
          <span>Next</span>
          <ChevronRightIcon size= { 20 } />
        </button>
      </div>
    </nav>
  );
}
