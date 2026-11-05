import { Loading } from '@/src/client/components/Loading';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatBytes, formatDateTime, formatDuration, formatNumber } from '@/src/client/utils/format';
import type { MediaRecord, MediaStats, MediaType } from '@/src/shared/types/media';
import type { HistoryRecord } from '@/src/shared/types/plays';
import type { PlaylistRecord } from '@/src/shared/types/playlists';
import type { ProgressRecord } from '@/src/shared/types/progress';
import { ArrowRightIcon, ListVideoIcon } from 'lucide-react';
import { Link } from 'react-router';
import { MediaIcon } from '../components/MediaIcon';


interface HomeMedia {
  media: MediaRecord;
  subtitle?: string;
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


function MediaShelf ( { title, to, items }: MediaShelfProps ) {
  return items.length > 0 && (
    <></>
  );
}

function PlaylistShelf ( { items }: PlaylistShelfProps ) {
  return items.length > 0 && (
    <></>
  );
}


export function Home () {
  const { media, progress, plays, search, playlists, user } = useApi();


  const { data, loading, error } = useApiData< HomeData >( user?.id ?? '', async () => {
    if ( ! user ) throw new Error( 'User not found.' );

    const [ stats, progressRecords, historyRecords, playlistRecords, favoriteResult ] = await Promise.all( [
      media.stats(), progress.list( [] ), plays.list( { limit: 24 } ), playlists.list( { limit: 6 } ), search( {
        favorite: true, userId: user.id, available: true, limit: 6, sortBy: 'title', sortDirection: 'asc'
      } )
    ] );

    const continuing = progressRecords.filter( i => ! i.completed && i.positionMs > 0 ).slice( 0, 6 );
    const continueResult = continuing.length ? await search( {
      ids: continuing.map( ( { mediaId } ) => mediaId ), available: true, limit: 6
    } ) : null;

    const continueById = new Map( ( continueResult?.items ?? [] ).map( item => [ item.id, item ] ) );

    const playlistPreviews = await Promise.all( playlistRecords.map( async playlist => {
      const [ item ] = await playlists.items( playlist.id, { limit: 1 } );
      return { playlist, mediaId: item?.mediaId ?? null };
    } ) );

    const previewIds = playlistPreviews.flatMap( item => item.mediaId ? [ item.mediaId ] : [] );
    const previewResult = previewIds.length ? await search( {
      ids: previewIds, available: true, limit: previewIds.length
    } ) : null;

    const previewById = new Map( ( previewResult?.items ?? [] ).map( item => [ item.id, item ] ) );

    const seen = new Set< string >();
    const recentHistory = historyRecords.filter( ( i ): i is HistoryRecord & { media: MediaRecord } => {
      if ( ! i.media?.available || seen.has( i.media.id ) ) return false;
      seen.add( i.media.id );
      return true;
    } ).slice( 0, 6 );

    return {
      stats,
      continuing: continuing.flatMap( ( { mediaId, positionMs } ) => {
        const found = continueById.get( mediaId );
        return found ? [ { media: found, progress: found.durationMs ?
          Math.min( 100, positionMs / found.durationMs * 100 ) : 0 } ] : [];
      } ),
      history: recentHistory.map( ( { media, startedAt } ) => ( {
        media: media, subtitle: formatDateTime( startedAt )
      } ) ),
      favorites: favoriteResult.items.map( media => ( { media } ) ),
      playlists: playlistPreviews.map( ( { playlist, mediaId } ) => ( {
        playlist: playlist, media: mediaId ? previewById.get( mediaId ) ?? null : null
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
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-12'>
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
    </div>
  );
}
