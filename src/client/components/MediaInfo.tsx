import { formatBytes, formatDate } from '@/src/client/utils/format';
import type { MediaRecord } from '@/src/shared/types/media';
import { CalendarIcon, GlobeIcon, LinkIcon, UserIcon, WeightIcon } from 'lucide-react';


interface MediaInfoProps {
  media: MediaRecord;
}


export function MediaInfo ( { media }: MediaInfoProps ) {
  const items = [
    [ 'Size', formatBytes( media.sizeBytes ), WeightIcon ],
    [ 'Modified', formatDate( media.modifiedAt ), CalendarIcon ],
    [ 'Added', formatDate( media.createdAt ), CalendarIcon ],
    [ 'Creator', media.creator ?? '—', UserIcon ],
    [ 'Language', media.language ?? '—', GlobeIcon ],
    [ 'Published', formatDate( media.releasedAt ), LinkIcon ],
    [ 'Recorded', formatDate( media.recordedAt ), CalendarIcon ]
  ] as const;

  return (
    <div className= 'space-y-3'>
      <h2 className= 'text-sm font-medium tracking-wide text-slate-300'>
        Informationen
      </h2>

      <div className= 'grid grid-cols-2 gap-x-8 gap-y-1'>
        { items.map( ( [ label, value, Icon ] ) => (
          <div key= { label } className= 'flex flex-wrap items-start gap-8'>
            <div className= 'flex flex-wrap items-center gap-2 h-8 text-slate-400'>
              <Icon size= { 16 } />

              <span className= 'text-xs uppercase tracking-wider'>
                { label }
              </span>
            </div>

            <span className= 'min-w-0 py-1.5 text-sm wrap-break-words'>
              { value }
            </span>
          </div>
        ) ) }
      </div>
    </div>
  );
}
