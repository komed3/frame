import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { Pagination, MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord } from '@/src/shared/types/media';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat } from '@/src/client/utils/format';
import { FolderIcon } from 'lucide-react';
import { useState } from 'react';


interface FolderProps {
  directories: MediaDirectoryEntry[];
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
}

interface MediaProps {
  media: MediaRecord[];
  onOpenMedia: ( media: MediaRecord ) => void;
}

type ListProps = FolderProps & MediaProps;

interface MediaBrowserProps {
  directories?: MediaDirectoryEntry[];
  media: MediaRecord[];
  offset: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  onPageChange: ( offset: number ) => void;
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
  onOpenMedia: ( media: MediaRecord ) => void;
}


function FolderGrid ( { directories, onOpenDirectory }: FolderProps ) {
  return directories.length > 0 && (
    <div className= 'grid grid-cols-8 gap-3'></div>
  );
}

function MediaGrid ( { media, onOpenMedia }: MediaProps ) {
  return media.length > 0 && (
    <div className= 'grid-cols-4 gap-x-3 gap-y-5'></div>
  );
}

function MediaList ( { directories, media, onOpenDirectory, onOpenMedia }: ListProps ) {
  return (
    <div className= 'overflow-x-auto'>
      <table className= 'w-full text-left text-sm whitespace-nowrap'>
        <thead className= 'text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700'>
          <tr className= '*:font-medium *:px-3 *:py-2'>
            <th scope= 'col' className= 'pl-0!'>Name</th>
            <th scope= 'col'>Format</th>
            <th scope= 'col' className= 'text-right'>Size</th>
            <th scope= 'col' className= 'text-right'>Duration</th>
            <th scope= 'col' className= 'text-right'>Resolution</th>
            <th scope= 'col' className= 'pr-0!'>Modified</th>
          </tr>
        </thead>

        <tbody className= 'divide-y divide-slate-700/70'>
          { directories.map( d => (
            <tr
              key= { `directory-${ d.id }` }
              className= 'cursor-pointer hover:bg-slate-50/5'
              onClick= { () => onOpenDirectory?.( d ) }
            >
              <td colSpan= { 6 } className= 'px-3 py-3'>
                <div className= 'flex items-center gap-3'>
                  <FolderIcon size= { 16 } />
                  <span>{ d.name }</span>
                </div>
              </td>
            </tr>
          ) ) }
        </tbody>
      </table>
    </div>
  );
}


export function MediaBrowser ( {
  directories = [], media, offset, limit = MEDIA_PAGE_SIZE, total, hasNext,
  onPageChange, onOpenDirectory, onOpenMedia
}: MediaBrowserProps ) {
  const [ view, setView ] = useState< MediaViewMode >( 'grid' );

  return (
    <div className= 'space-y-8'>
      <div className= 'flex justify-end'>
        <ViewToggle value= { view } onChange= { setView } />
      </div>

      { view === 'grid' ? (
        <></>
      ) : (
        <MediaList
          directories= { directories }
          media= { media }
          onOpenDirectory= { onOpenDirectory }
          onOpenMedia= { onOpenMedia }
        />
      ) }

      { ! directories.length && ! media.length && (
        <p className= 'py-16 text-center text-slate-500'>
          No media found.
        </p>
      ) }

      <Pagination
        offset= { offset }
        limit= { limit }
        itemCount= { media.length }
        total= { total }
        hasNext= { hasNext }
        onChange= { onPageChange }
      />
    </div>
  );
}
