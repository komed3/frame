import { formatBytes, formatDate, formatDimensions, formatDuration, formatNumber } from '@/src/client/utils/format';
import type { MediaRecord } from '@/src/shared/types/media';
import {
  CalendarPlusIcon, ClockIcon, Columns3Icon, Disc3Icon, FileIcon, FilmIcon, GlobeIcon,
  HourglassIcon, LinkIcon, SquareDimensionsIcon, UserIcon, VideoIcon
} from 'lucide-react';


interface MediaInfoProps {
  media: MediaRecord;
}


export function MediaInfo ( { media }: MediaInfoProps ) {
  const items = [
    [ 'Duration', formatDuration( media.durationMs ), HourglassIcon ],
    [ 'File Size', formatBytes( media.sizeBytes ), Disc3Icon ],
    [ 'Dimensions', formatDimensions( media.width, media.height ), SquareDimensionsIcon ],
    [ 'File Type', media.type, FileIcon ],
    [ 'Modified', formatDate( media.modifiedAt ), ClockIcon ],
    [ 'Added', formatDate( media.createdAt ), CalendarPlusIcon ],
    [ 'Creator', media.creator ?? '—', UserIcon ],
    [ 'Language', media.language ?? '—', GlobeIcon ],
    [ 'Published', formatDate( media.releasedAt ), LinkIcon ],
    [ 'Recorded', formatDate( media.recordedAt ), VideoIcon ],
    [ 'FPS', formatNumber( media.fps ), FilmIcon ],
    [ 'Bitrate', formatNumber( media.bitrate ), Columns3Icon ]
  ] as const;

  return (
    <div className= 'space-y-3'>
      <h2 className= 'text-sm font-medium tracking-wide text-slate-300'>
        Media Info
      </h2>

      <div className= 'grid grid-cols-3 gap-x-8 gap-y-1'>
        { items.map( ( [ label, value, Icon ] ) => (
          <div key= { label } className= 'flex flex-wrap items-start gap-8'>
            <div className= 'flex flex-wrap items-center gap-2 h-8 text-slate-400'>
              <Icon size= { 16 } />

              <span className= 'text-xs uppercase tracking-wider'>
                { label }
              </span>
            </div>

            <span className= 'min-w-0 py-1.5 text-sm capitalize wrap-break-words'>
              { value }
            </span>
          </div>
        ) ) }
      </div>
    </div>
  );
}
