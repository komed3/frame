import type { MediaMetadataRecord } from '@/src/shared/types/metadata';


interface MediaMetadataProps {
  items: MediaMetadataRecord[];
}


export function MediaMetadata ( { items }: MediaMetadataProps ) {
  return ! items.length ? (
    <p className= 'py-16 text-center text-slate-400'>
      No metadata found.
    </p>
  ) : (
    <div className= 'grid grid-cols-2 gap-8'>
      { items.map( ( { id, key, value } ) => (
        <div key= { id } className= 'flex flex-col items-start gap-2'>
          <div className= 'text-xs uppercase tracking-wider text-slate-400'>
            { key }
          </div>

          <div className= 'min-w-0 text-sm capitalize wrap-break-words'>
            { value }
          </div>
        </div>
      ) ) }
    </div>
  );
}
