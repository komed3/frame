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
    <div className= 'grid grid-cols-4 gap-3'>
      { directories.map( directory => (
        <button
          key= { directory.id }
          onClick= { () => onOpenDirectory?.( directory ) }
          disabled= { ! onOpenDirectory }
          className= {
            'flex items-center gap-4 min-w-0 h-16 px-4 bg-slate-50/5 rounded transition ' +
            'duration-100 hover:bg-slate-50/10 disabled:cursor-default'
          }
        >
          <FolderIcon size= { 26 } strokeWidth= { 1.4 } />

          <div className= 'flex flex-col items-start gap-0.5'>
            <span className= 'w-full truncate text-center text-sm font-medium'>
              { directory.name }
            </span>

            <span className= 'text-xs text-slate-400'>
              { directory.mediaCount } { directory.mediaCount === 1 ? 'item' : 'items' }
            </span>
          </div>
        </button>
      ) ) }
    </div>
  );
}

function MediaGrid ( { media, onOpenMedia }: MediaProps ) {
  return media.length > 0 && (
    <div className= 'grid-cols-3 gap-x-3 gap-y-5'></div>
  );
}

function MediaList ( { directories, media, onOpenDirectory, onOpenMedia }: ListProps ) {
  return (
    <div className= 'overflow-x-auto'>
      <table className= 'w-full text-left text-sm whitespace-nowrap'>
        <thead className= 'text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700'>
          <tr className= '*:font-medium *:px-4 *:py-3'>
            <th scope= 'col'>Name</th>
            <th scope= 'col'>Format</th>
            <th scope= 'col' className= 'text-right'>Size</th>
            <th scope= 'col' className= 'text-right'>Duration</th>
            <th scope= 'col' className= 'text-right'>Resolution</th>
            <th scope= 'col'>Modified</th>
          </tr>
        </thead>

        <tbody className= 'divide-y divide-slate-700/70'>
          { directories.map( d => (
            <tr
              key= { `directory-${ d.id }` }
              onClick= { () => onOpenDirectory?.( d ) }
              className= 'group cursor-pointer *:p-4 transition-colors duration-100 hover:bg-slate-50/5'
            >
              <td colSpan= { 6 }>
                <div className= 'flex items-center gap-3 min-w-0'>
                  <FolderIcon size= { 16 } />

                  <span className= 'truncate transition-colors duration-100 group-hover:text-sky-400'>
                    { d.name }
                  </span>
                </div>
              </td>
            </tr>
          ) ) }

          { media.map( item => (
            <tr
              key= { item.id }
              onClick= { () => onOpenMedia( item ) }
              className= 'group cursor-pointer *:p-4 transition-colors duration-100 hover:bg-slate-50/5'
            >
              <td>
                <div className= 'flex items-center gap-3 min-w-0'>
                  <MediaIcon type= { item.type } size= { 16 } />

                  <span className= 'truncate transition-colors duration-100 group-hover:text-sky-400'>
                    { item.title || item.fileName }
                  </span>
                </div>
              </td>

              <td>{ formatFileFormat( item.fileName, item.container ) }</td>

              <td className= 'text-right tabular-nums'>
                { formatBytes( item.sizeBytes ) }
              </td>

              <td className= 'text-right tabular-nums'>
                { item.type === 'video' || item.type === 'audio' ? formatDuration( item.durationMs ) : '—' }
              </td>

              <td className= 'text-right tabular-nums'>
                { formatDimensions( item.width, item.height ) }
              </td>

              <td>{ formatDate( item.modifiedAt ) }</td>
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
        <>
          { directories.length > 0 && (
            <section className= 'space-y-4'>
              <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Folders</h2>
              <FolderGrid directories= { directories } onOpenDirectory= { onOpenDirectory } />
            </section>
          ) }

          { media.length > 0 && (
            <section className= 'space-y-4'>
              { directories.length > 0 && (
                <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Media</h2>
              ) }
              <MediaGrid media= { media } onOpenMedia= { onOpenMedia } />
            </section>
          ) }
        </>
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
