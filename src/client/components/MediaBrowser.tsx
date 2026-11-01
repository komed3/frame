import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import { useApi } from '@/src/client/context/ApiContext';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat } from '@/src/client/utils/format';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord } from '@/src/shared/types/media';
import type { ProgressRecord } from '@/src/shared/types/progress';
import type { MediaRoot } from '@/src/shared/types/roots';
import { CheckIcon, FolderIcon } from 'lucide-react';
import { useEffect, useState } from 'react';


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
  progress?: Record< string, ProgressRecord >;
  played?: Record< string, boolean >;
  onOpenMedia: ( media: MediaRecord ) => void;
}

type ListProps = RootProps & FolderProps & MediaProps;

interface MediaBrowserProps {
  roots?: MediaRoot[];
  directories?: MediaDirectoryEntry[];
  media: MediaRecord[];
  loading?: boolean;
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
            'flex items-center gap-5 min-w-0 h-16 px-4 bg-slate-50/5 ' +
            'rounded transition hover:bg-slate-50/10'
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
            'flex items-center gap-5 min-w-0 h-16 px-4 bg-slate-50/5 ' +
            'rounded transition hover:bg-slate-50/10'
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

function MediaGrid ( { media, progress, played, onOpenMedia }: MediaProps ) {
  return media.length > 0 && (
    <div className= 'grid grid-cols-3 gap-x-5 gap-y-8'>
      { media.map( item => {
        const itemProgress = progress?.[ item.id ];
        const percentage = itemProgress?.completed ? 100 : itemProgress && item.durationMs ?
          Math.max( 0, Math.min( 100, itemProgress.positionMs / item.durationMs * 100 ) ) : 0;

        return (
          <button
            key= { item.id }
            onClick= { () => onOpenMedia( item ) }
            className= 'group flex flex-col gap-3'
          >
            <div className= 'relative w-full aspect-video'>
              <MediaThumbnail media= { item } />
              <MediaIcon type= { item.type } className= 'absolute top-4 right-4 z-1 opacity-50' />

              { played?.[ item.id ] && (
                <CheckIcon size= { 20 } className= 'absolute top-4 left-4 z-1 opacity-50' />
              ) }

              { !! itemProgress && ( itemProgress.completed || itemProgress.positionMs > 0 ) &&
                ( itemProgress.completed || !! item.durationMs ) && (
                <div className= 'absolute inset-x-0 bottom-0 h-1 bg-slate-950/60'>
                  <div
                    className= 'h-full bg-sky-500'
                    style= { { width: `${ percentage }%` } }
                  />
                </div>
              ) }
            </div>

            <div className= 'flex justify-between items-start gap-6'>
              <span
                className= {
                  'flex-1 min-w-0 text-left text-sm font-medium line-clamp-2 wrap-break-words ' +
                  'transition-colors group-hover:text-sky-400'
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
        );
      } ) }
    </div>
  );
}

function MediaList ( { roots, directories, media, onOpenRoot, onOpenDirectory, onOpenMedia }: ListProps ) {
  return (
    <div className= 'overflow-x-auto bg-slate-900/40 rounded shadow-lg'>
      <table className= 'w-full text-sm text-left whitespace-nowrap'>
        <thead className= 'text-xs text-slate-400 uppercase tracking-wider bg-slate-700/40'>
          <tr className= '*:px-5 *:py-4 *:font-medium'>
            <th>Name</th>
            <th>Format</th>
            <th className= 'text-right'>Size</th>
            <th className= 'text-right'>Duration</th>
            <th className= 'text-right'>Resolution</th>
            <th>Modified</th>
          </tr>
        </thead>

        <tbody className= 'divide-y divide-slate-700/70'>
          { roots.map( root => (
            <tr
              key= { `root-${ root.id }` }
              onClick= { () => onOpenRoot?.( root ) }
              className= 'group cursor-pointer *:px-5 *:py-4 transition-colors hover:bg-slate-50/5'
            >
              <td colSpan= { 6 }>
                <div className= 'flex items-center gap-3 min-w-0'>
                  <FolderIcon size= { 16 } />
                  <span className= 'truncate transition-colors group-hover:text-sky-400'>
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
              className= 'group cursor-pointer *:p-4 transition-colors hover:bg-slate-50/5'
            >
              <td colSpan= { 6 }>
                <div className= 'flex items-center gap-3 min-w-0'>
                  <FolderIcon size= { 16 } />

                  <span className= 'truncate transition-colors group-hover:text-sky-400'>
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
              className= 'group cursor-pointer *:p-4 transition-colors hover:bg-slate-50/5'
            >
              <td>
                <div className= 'flex items-center gap-3 min-w-0 max-w-[15vw]'>
                  <MediaIcon type= { item.type } size= { 16 } className= 'shrink-0' />

                  <span className= 'truncate transition-colors group-hover:text-sky-400'>
                    { item.title || item.fileName }
                  </span>
                </div>
              </td>

              <td>
                <span className= 'px-2 py-1 font-mono text-xs bg-slate-50/10 rounded'>
                  { formatFileFormat( item.fileName, item.container ) }
                </span>
              </td>

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
  roots = [], directories = [], media, loading = false, offset, limit = MEDIA_PAGE_SIZE,
  total, hasNext, onPageChange, onOpenRoot, onOpenDirectory, onOpenMedia
}: MediaBrowserProps ) {
  const { progress, plays } = useApi();
  const [ progressByMedia, setProgressByMedia ] = useState< Record< string, ProgressRecord > >( {} );
  const [ playedByMedia, setPlayedByMedia ] = useState< Record< string, boolean > >( {} );
  const mediaIds = media.map( ( { id } ) => id ).join( ',' );

  const [ view, setView ] = useState< MediaViewMode >(
    () => localStorage.getItem( 'frame.mediaView' ) === 'list' ? 'list' : 'grid'
  );

  const changeView = ( value: MediaViewMode ) => {
    localStorage.setItem( 'frame.mediaView', value );
    setView( value );
  };


  useEffect( () => {
    let active = true;

    setProgressByMedia( {} );
    setPlayedByMedia( {} );

    if ( view !== 'grid' || ! mediaIds ) return;
    const ids = mediaIds.split( ',' );

    progress.list( ids ).then( rec => { if ( active ) setProgressByMedia(
      Object.fromEntries( rec.map( i => [ i.mediaId, i ] ) )
    ) } ).catch( () => { if ( active ) setProgressByMedia( {} ) } );

    plays.status( ids ).then( rec => { if ( active ) setPlayedByMedia(
      Object.fromEntries( rec.map( i => [ i.mediaId, i.completed ] ) )
    ) } ).catch( () => { if ( active ) setPlayedByMedia( {} ) } );

    return () => { active = false };
  }, [ mediaIds, plays, progress, view ] );


  return (
    <div className= 'space-y-8'>
      <div className= 'flex justify-end'>
        <ViewToggle value= { view } onChange= { changeView } />
      </div>

      { loading ? (
        <Loading size= { 32 } className= 'py-32' />
      ) : (
        <>
          { view === 'grid' ? (
            <>
              { roots.length > 0 && (
                <section className= 'space-y-4'>
                  <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Roots</h2>
                  <RootGrid
                    roots= { roots }
                    onOpenRoot= { onOpenRoot }
                  />
                </section>
              ) }

              { directories.length > 0 && (
                <section className= 'space-y-4'>
                  <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Folders</h2>
                  <FolderGrid
                    directories= { directories }
                    onOpenDirectory= { onOpenDirectory }
                  />
                </section>
              ) }

              { media.length > 0 && (
                <section className= 'space-y-4'>
                  { directories.length > 0 && (
                    <h2 className= 'uppercase text-xs font-medium tracking-wider text-slate-400'>Media</h2>
                  ) }
                  <MediaGrid
                    media= { media }
                    progress= { progressByMedia }
                    played= { playedByMedia }
                    onOpenMedia= { onOpenMedia }
                  />
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

          { ( roots.length > 0 || directories.length > 0 || media.length > 0 ) && (
            <Pagination
              offset= { offset }
              limit= { limit }
              itemCount= { media.length }
              total= { total }
              hasNext= { hasNext }
              onChange= { onPageChange }
            />
          ) }
        </>
      ) }
    </div>
  );
}
