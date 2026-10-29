import type { MediaMetadataRecord } from '@/src/shared/types/metadata';


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
        { items.map( ( { id, key, value } ) => (
          <div key= { id } className= 'flex flex-wrap items-start gap-8'>
            <div className= 'text-xs uppercase tracking-wider text-slate-400'>
              { key }
            </div>

            <div className= 'min-w-0 py-1.5 text-sm capitalize wrap-break-words'>
              { value }
            </div>
          </div>
        ) ) }
      </div>
    </div>
  );
}
