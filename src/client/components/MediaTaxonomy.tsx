import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';


interface MediaTaxonomyProps {
  type: 'category' | 'tag';
  items: ( CategoryRecord | TagRecord )[];
  label: string;
}


export function MediaTaxonomy ( { type, items, label }: MediaTaxonomyProps ) {
  return items.length > 0 && (
    <div className= 'flex flex-wrap items-center gap-2'>
      <span className= 'text-xs uppercase tracking-wider text-slate-400'>
        { label }
      </span>

      { items.map( item => (
        <span
          key= { item.id }
          className= 'text-sm text-slate-300'
        >
          { item.name }
        </span>
      ) ) }
    </div>
  );
}
