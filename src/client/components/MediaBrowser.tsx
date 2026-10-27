import { useApi } from '@/src/client/context/ApiContext';
import { Pagination, MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import { FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon, FolderIcon } from 'lucide-react';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord, MediaType } from '@/src/shared/types/media';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat, formatMediaType } from '@/src/client/utils/format';
import { useEffect, useState } from 'react';


interface FolderGridProps {
  directories: MediaDirectoryEntry[];
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
}

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


function FolderGrid ( { directories, onOpenDirectory }: FolderGridProps ) {
  if ( ! directories.length ) return null;

  return (
    <section className= 'space-y-3'>
      <h2 className= 'text-sm font-medium text-slate-400'>Folders</h2>

      <div className= 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3'>
        { directories.map( directory => (
          <button
            key= { directory.id }
            type= 'button'
            disabled= { ! onOpenDirectory }
            onClick= { () => onOpenDirectory?.( directory ) }
            className= {
              'flex flex-col justify-center items-center gap-2 aspect-2/3 min-w-0 p-3 ' +
              'bg-slate-800 rounded hover:bg-slate-700 disabled:cursor-default'
            }
          >
            <FolderIcon size= { 22 } />

            <span className= 'w-full truncate text-center text-sm'>
              { directory.name }
            </span>

            <span className= 'text-xs text-slate-500'>
              { directory.mediaCount } { directory.mediaCount === 1 ? 'item' : 'items' }
            </span>
          </button>
        ) ) }
      </div>
    </section>
  );
}
