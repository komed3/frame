import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import { DatabaseIcon } from 'lucide-react';


interface MediaMetadataProps {
  items: MediaMetadataRecord[];
}


export function MediaMetadata ( { items }: MediaMetadataProps ) {
  return items.length > 0 && (
    <div className= 'space-y-3'>
      <h2 className= 'text-sm font-medium tracking-wide text-slate-300'>
        Metadata
      </h2>

      <div className= 'grid grid-cols-3 gap-x-8 gap-y-1'>
        { items.map( ( item ) => (
          <div key= { item.id } className= 'flex flex-wrap items-start gap-8'>
            <div className= 'text-xs uppercase tracking-wider text-slate-400'>
              { item.key }
            </div>
          </div>
        ) ) }
      </div>
    </div>
  );
}
