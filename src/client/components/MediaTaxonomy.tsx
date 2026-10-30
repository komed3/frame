import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { FolderIcon, TagIcon } from 'lucide-react';
import { Link } from 'react-router';


interface MediaTaxonomyProps {
  type: 'category' | 'tag';
  items: ( CategoryRecord | TagRecord )[];
  label?: string;
}


export function MediaTaxonomy ( { type, items, label }: MediaTaxonomyProps ) {
  return items.length > 0 && (
    <div className= 'flex flex-wrap items-start gap-8'>
      <div className= 'flex flex-wrap items-center gap-2 h-8 text-slate-400'>
        { type === 'category' && <FolderIcon size= { 16 } /> }
        { type === 'tag' && <TagIcon size= { 16 } /> }

        <span className= 'text-xs uppercase tracking-wider'>
          { label ?? { category: 'Category', tag: 'Tags' }[ type ] }
        </span>
      </div>

      <div className= 'flex flex-wrap gap-2'>
        { items.map( ( { id, name } ) => (
          <Link
            key= { id }
            to= { `/${ type }/${ id }` }
            className= {
              'px-4 py-1.5 text-sm bg-slate-50/10 rounded-full shadow-lg ' +
              'transition-colors hover:bg-slate-50/20'
            }
          >
            { name }
          </Link>
        ) ) }
      </div>
    </div>
  );
}
