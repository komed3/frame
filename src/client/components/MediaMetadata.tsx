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
    </div>
  );
}
