import { formatBytes, formatDate, formatFileFormat } from '@/src/client/utils/format';
import type { MediaRecord } from '@/src/shared/types/media';


interface MediaInfoProps {
  media: MediaRecord;
}


export function MediaInfo ( { media }: MediaInfoProps ) {
  return (
    <div className= 'space-y-3'>
      <h2 className= 'text-sm font-medium tracking-wide text-slate-300'>
        Informationen
      </h2>
    </div>
  );
}
