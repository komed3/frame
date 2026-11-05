import { Loading } from '@/src/client/components/Loading';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatBytes, formatDuration, formatNumber } from '@/src/client/utils/format';
import type { MediaRecord, MediaStats, MediaType } from '@/src/shared/types/media';
import type { PlaylistRecord } from '@/src/shared/types/playlists';
import type { HistoryRecord } from '@/src/shared/types/plays';
import { ArrowRightIcon, ListVideoIcon } from 'lucide-react';
import { Link } from 'react-router';
import { MediaIcon } from '../components/MediaIcon';


interface HomeMedia {
  media: MediaRecord;
  progress?: number;
}

interface HomePlaylist {
  playlist: PlaylistRecord;
  media: MediaRecord | null;
}

interface HomeData {
  stats: MediaStats;
  continuing: HomeMedia[];
  history: HomeMedia[];
  favorites: HomeMedia[];
  playlists: HomePlaylist[];
}

interface MediaShelfProps {
  title: string;
  to: string;
  items: HomeMedia[];
}

interface PlaylistShelfProps {
  items: HomePlaylist[];
}


const MORE_BUTTON =
  'flex items-center gap-2.5 px-5 py-2.5 text-normal bg-slate-50/10 rounded-full ' +
  'transition-colors hover:bg-slate-50/20';


function MediaShelf ( { title, to, items }: MediaShelfProps ) {
  return items.length > 0 && (
    <div className= 'space-y-8'>
      <div className= 'flex justify-between items-center'>
        <h2 className= 'text-lg font-medium tracking-wide'>
          { title }
        </h2>

        <Link to= { to } className= { MORE_BUTTON }>
          <span>View all</span>
          <ArrowRightIcon size= { 18 } />
        </Link>
      </div>

      <div className= 'grid grid-cols-3 gap-x-4 gap-y-8'>
        { items.map( ( { media, progress } ) => (
          <Link
            key= { media.id }
            to= { `/watch/${ media.id }` }
            className= 'group min-w-0 space-y-2'
          >
            <div className= 'relative'>
              <MediaThumbnail media= { media } />

              { progress !== undefined && (
                <div className= 'absolute inset-x-0 bottom-0 h-1 bg-slate-950/60'>
                  <div
                    className= 'h-full bg-sky-500'
                    style= { { width: `${ progress }%` } }
                  />
                </div>
              ) }
            </div>

            <div className= 'flex justify-between items-start gap-3 text-sm'>
              <span
                className= {
                  'flex-1 min-w-0 font-medium line-clamp-2 wrap-break-words ' +
                  'transition-colors group-hover:text-sky-400'
                }
              >
                { media.title || media.fileName }
              </span>

              { media.durationMs !== null && (
                <span className= 'shrink-0 text-slate-400 tabular-nums'>
                  { formatDuration( media.durationMs ) }
                </span>
              ) }
            </div>
          </Link>
        ) ) }
      </div>
    </div>
  );
}

function PlaylistShelf ( { items }: PlaylistShelfProps ) {
  return items.length > 0 && (
    <div className= 'space-y-8'>
      <div className= 'flex justify-between items-center'>
        <h2 className= 'text-lg font-medium tracking-wide'>
          Playlists
        </h2>

        <Link to= '/playlists' className= { MORE_BUTTON }>
          <span>View all</span>
          <ArrowRightIcon size= { 18 } />
        </Link>
      </div>

      <div className= 'grid grid-cols-3  gap-x-4 gap-y-8'>
        { items.map( ( { playlist, media } ) => (
          <Link
            key= { playlist.id }
            to= { `/playlist/${ playlist.id }` }
            className= 'group min-w-0 space-y-2'
          >
            { media ? (
              <MediaThumbnail media= { media } />
            ) : (
              <div className= 'flex justify-center items-center aspect-video bg-slate-50/5 rounded'>
                <ListVideoIcon size= { 36 } strokeWidth= { 0.8 } className= 'opacity-25' />
              </div>
            ) }

            <p className= 'truncate text-sm font-medium transition-colors group-hover:text-sky-400'>
              { playlist.name }
            </p>
          </Link>
        ) ) }
      </div>
    </div>
  );
}


export function Home () {
  const { media, progress, plays, search, playlists, user } = useApi();


  const { data, loading, error } = useApiData< HomeData >( user?.id ?? '', async () => {
    if ( ! user ) throw new Error( 'User not found.' );

    const [ stats, historyRecords, playlistRecords, favoriteResult ] = await Promise.all( [
      media.stats(), plays.list( { limit: 24 } ), playlists.list( { limit: 6 } ), search( {
        favorite: true, userId: user.id, available: true, limit: 6, sortBy: 'title', sortDirection: 'asc'
      } )
    ] );

    const progressRecords = await progress.list( [ ...new Set( historyRecords.map( i => i.mediaId ) ) ] );
    const continuing = progressRecords.filter( i => ! i.completed && i.positionMs > 0 ).slice( 0, 6 );

    const playlistItems = await Promise.all( playlistRecords.map( async playlist =>
      ( await playlists.items( playlist.id, { limit: 1 } ) )[ 0 ]?.mediaId
    ) );

    const ids = [ ...new Set( [
      ...continuing.map( i => i.mediaId ),
      ...playlistItems.flatMap( id => id ? [ id ] : [] )
    ] ) ];

    const mediaResult = ids.length ? await search( { ids, available: true, limit: ids.length } ) : null;
    const mediaById = new Map( ( mediaResult?.items ?? [] ).map( i => [ i.id, i ] ) );

    const seen = new Set< string >();
    const history = historyRecords.filter( ( i ): i is HistoryRecord & { media: MediaRecord } => {
      if ( ! i.media?.available || seen.has( i.media.id ) ) return false;
      seen.add( i.media.id );
      return true;
    } ).slice( 0, 6 );

    return {
      stats,
      continuing: continuing.flatMap( ( { mediaId, positionMs } ) => {
        const media = mediaById.get( mediaId );
        return media ? [ { media, progress: media.durationMs
          ? Math.min( 100, positionMs / media.durationMs * 100 ) : 0 } ] : [];
      } ),
      history: history.map( ( { media } ) => ( { media } ) ),
      favorites: favoriteResult.items.map( media => ( { media } ) ),
      playlists: playlistRecords.map( ( playlist, i ) => ( {
        playlist, media: mediaById.get( playlistItems[ i ] ?? '' ) ?? null
      } ) )
    };
  } );


  usePageTitle( '' );


  if ( loading ) return <Loading className= 'min-h-[50vh]' />;

  if ( error || ! data ) return (
    <div className= 'mx-auto my-12 max-w-7xl px-6'>
      <p role= 'alert' className= 'py-16 text-center text-red-400'>
        { error ?? 'Unable to load dashboard.' }
      </p>
    </div>
  );


  const { stats } = data;


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-20'>
      <div className= 'space-y-4'>
        <h1 className= 'text-2xl font-light tracking-wide'>
          Overview
        </h1>

        <div className= 'grid grid-cols-4 gap-4'>
          { [
            [ 'Media', formatNumber( stats.total ) ],
            [ 'Storage', formatBytes( stats.sizeBytes ) ],
            [ 'Duration', formatDuration( stats.durationMs ) ],
            [ 'Available', formatNumber( stats.available ) ]
          ].map( ( [ label, value ] ) => (
            <div key= { label } className= 'p-4 space-y-0.5 bg-slate-800 rounded shadow-lg'>
              <p className= 'text-xs uppercase tracking-wider text-slate-500'>
                { label }
              </p>

              <p className= 'text-xl font-medium tabular-nums'>
                { value }
              </p>
            </div>
          ) ) }
        </div>

        <div className= 'grid grid-cols-5 gap-4'>
          { [
            [ 'video', 'Videos', formatNumber( stats.videoCount ) ],
            [ 'audio', 'Audio', formatNumber( stats.audioCount ) ],
            [ 'image', 'Images', formatNumber( stats.imageCount ) ],
            [ 'text', 'Text', formatNumber( stats.textCount ) ],
            [ 'other', 'Other', formatNumber( stats.otherCount ) ]
          ].map( ( [ type, label, value ] ) => (
            <div key= { label } className= 'flex items-center gap-2 px-4 py-3 bg-slate-800 rounded shadow-lg'>
              <MediaIcon type= { type as MediaType } size= { 16 } />

              <span className= 'min-w-0 truncate'>
                { label }
              </span>

              <b className= 'flex-1 text-right font-medium tabular-nums'>
                { value }
              </b>
            </div>
          ) ) }
        </div>
      </div>

      <MediaShelf
        title= 'Continue Watching'
        to= '/history'
        items= { data.continuing }
      />

      <MediaShelf
        title= 'Recently Played'
        to= '/history'
        items= { data.history }
      />

      <MediaShelf
        title= 'Favorites'
        to= '/favorites'
        items= { data.favorites }
      />

      <PlaylistShelf items= { data.playlists } />
    </div>
  );
}
