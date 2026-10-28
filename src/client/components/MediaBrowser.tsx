import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat } from '@/src/client/utils/format';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord } from '@/src/shared/types/media';
import type { MediaRoot } from '@/src/shared/types/roots';
import { FolderIcon } from 'lucide-react';
import { useState } from 'react';


interface RootProps {
  roots: MediaRoot[];
  onOpenRoot?: ( root: MediaRoot ) => void;
}

interface FolderProps {
  directories: MediaDirectoryEntry[];
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
}

interface MediaProps {
  media: MediaRecord[];
  onOpenMedia: ( media: MediaRecord ) => void;
}

type ListProps = RootProps & FolderProps & MediaProps;

interface MediaBrowserProps {
  roots: MediaRoot[];
  directories?: MediaDirectoryEntry[];
  media: MediaRecord[];
  offset: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  onPageChange: ( offset: number ) => void;
  onOpenRoot?: ( root: MediaRoot ) => void;
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
  onOpenMedia: ( media: MediaRecord ) => void;
}


const rootName = ( root: MediaRoot ) => root.path.split( /[\\/]/ ).filter( Boolean ).pop() ?? root.path;

function RootGrid ( { roots, onOpenRoot }: RootProps ) {
  return roots.length > 0 && (
    <div className= 'grid grid-cols-4 gap-3'>
      { roots.map( root => (
        <button
          key= { root.id }
          onClick= { () => onOpenRoot?.( root ) }
          className= {
            'flex items-center gap-5 min-w-0 h-16 px-4 bg-slate-50/5 rounded transition ' +
            'duration-100 hover:bg-slate-50/10'
          }
        >
          <FolderIcon size= { 26 } strokeWidth= { 1.4 } />

          <span className= 'truncate text-sm font-medium'>
            { rootName( root ) }
          </span>
        </button>
      ) ) }
    </div>
  );
}

function FolderGrid ( { directories, onOpenDirectory }: FolderProps ) {
  return directories.length > 0 && (
    <div className= 'grid grid-cols-4 gap-3'>
      { directories.map( directory => (
        <button
          key= { directory.id }
          onClick= { () => onOpenDirectory?.( directory ) }
          className= {
            'flex items-center gap-5 min-w-0 h-16 px-4 bg-slate-50/5 rounded transition ' +
            'duration-100 hover:bg-slate-50/10'
          }
        >
          <FolderIcon size= { 26 } strokeWidth= { 1.4 } />

          <span className= 'truncate text-sm font-medium'>
            { directory.name }
          </span>
        </button>
      ) ) }
    </div>
  );
}

function MediaGrid ( { media, onOpenMedia }: MediaProps ) {
  return media.length > 0 && (
    <div className= 'grid grid-cols-3 gap-x-5 gap-y-8'>
      { media.map( item => (
        <button
          key= { item.id }
          onClick= { () => onOpenMedia( item ) }
          className= 'group flex flex-col gap-3'
        >
          <div className= 'w-full aspect-video'>
            <MediaThumbnail media= { item } />
          </div>

          <div className= 'flex justify-between items-start gap-6'>
            <span
              className= {
                'flex-1 min-w-0 text-left text-sm font-medium line-clamp-2 wrap-break-words ' +
                'transition-colors duration-100 group-hover:text-sky-400'
              }
            >
              { item.title || item.fileName }
            </span>

            { ( item.type === 'video' || item.type === 'audio' ) && item.durationMs !== null && (
              <span className= 'shrink-0 text-sm text-slate-400'>
                { formatDuration( item.durationMs ) }
              </span>
            ) }
          </div>
        </button>
      ) ) }
    </div>
  );
}

function MediaList ( { roots, directories, media, onOpenRoot, onOpenDirectory, onOpenMedia }: ListProps ) {
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
        { roots.map( root => (
            <tr
              key= { `root-${ root.id }` }
              onClick= { () => onOpenRoot?.( root ) }
              className= 'group cursor-pointer *:p-4 transition-colors duration-100 hover:bg-slate-50/5'
            >
              <td colSpan= { 6 }>
                <div className= 'flex items-center gap-3 min-w-0'>
                  <FolderIcon size= { 16 } />
                  <span className= 'truncate transition-colors duration-100 group-hover:text-sky-400'>
                    { rootName( root ) }
                  </span>
                </div>
              </td>
            </tr>
          ) ) }

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
  roots = [], directories = [], media, offset, limit = MEDIA_PAGE_SIZE, total, hasNext,
  onPageChange, onOpenRoot, onOpenDirectory, onOpenMedia
}: MediaBrowserProps ) {
  const [ view, setView ] = useState< MediaViewMode >(
    () => localStorage.getItem( 'frame.mediaView' ) === 'list' ? 'list' : 'grid'
  );

  const changeView = ( value: MediaViewMode ) => {
    localStorage.setItem( 'frame.mediaView', value );
    setView( value );
  };

  return (
    <div className= 'space-y-8'>
      <div className= 'flex justify-end'>
        <ViewToggle value= { view } onChange= { changeView } />
      </div>

      { view === 'grid' ? (
        <>
          { roots.length > 0 && (
            <section className= 'space-y-4'>
              <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Roots</h2>
              <RootGrid roots= { roots } onOpenRoot= { onOpenRoot } />
            </section>
          ) }

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
          roots= { roots }
          directories= { directories }
          media= { media }
          onOpenRoot= { onOpenRoot }
          onOpenDirectory= { onOpenDirectory }
          onOpenMedia= { onOpenMedia }
        />
      ) }

      { ! roots.length && ! directories.length && ! media.length && (
        <p className= 'py-16 text-center text-slate-500'>
          No media found.
        </p>
      ) }

      { ( ! roots.length || directories.length > 0 || media.length > 0 ) && (
        <Pagination
          offset= { offset }
          limit= { limit }
          itemCount= { media.length }
          total= { total }
          hasNext= { hasNext }
          onChange= { onPageChange }
        />
      ) }
    </div>
  );
}
