import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { PlaybackRateControl } from '@/src/client/components/PlaybackRateControl';
import { VolumeControl } from '@/src/client/components/VolumeControl';
import { Waveform } from '@/src/client/components/Waveform';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useMediaPlayer } from '@/src/client/hooks/useMediaPlayer';
import { useWatchNavigation } from '@/src/client/hooks/useWatchNavigation';
import { formatDuration } from '@/src/client/utils/format';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, PauseIcon,
  PlayIcon, RotateCcwIcon, SkipBackIcon, SkipForwardIcon
} from 'lucide-react';
import { useNavigate } from 'react-router';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}

interface AudioPlayerData {
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
}


const BUTTON =
  'flex justify-center items-center size-10 rounded-full bg-slate-50/10 transition-colors ' +
  'hover:bg-slate-50/20 disabled:opacity-30 disabled:pointer-events-none';


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  const { media: mediaApi, directories } = useApi();
  const navigate = useNavigate();


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< AudioPlayerData >( key, async () => {
    const [ categories, tags, directory ] = await Promise.all( [
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] );

    return { categories, tags, directory };
  } );

  const title = media.title || media.fileName;
  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;


  const { prev, next, navigateAdjacent } = useWatchNavigation( media, playlistId );

  const {
    mediaRef, playerRef, volume, muted, rate, currentTime, displayDuration, timeLabel,
    buffered, playing, ended, ready, fullscreen, streamError, setRemaining, seek,
    togglePlay, changeVolume, saveVolume, setPlaybackRate, toggleMute, toggleFullscreen
  } = useMediaPlayer< HTMLAudioElement >( media );


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div
        ref= { playerRef }
        className= 'relative w-full min-h-[72] max-h-[168] aspect-2/1 bg-slate-950 rounded-lg overflow-hidden'
      >
        { loading ? (
          <Loading className= 'h-full' />
        ) : error ? (
          <div className= 'flex justify-center items-center h-full font-semibold text-red-400'>
            { error }
          </div>
        ) : (
          <>
            <MediaThumbnail media= { media } aspectRatio= 'w-full h-full' />

            <div
              className= {
                'absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/30 ' +
                'to-transparent pointer-events-none'
              }
            />

            <div className= 'absolute top-6 right-6 z-20 flex items-center gap-2'>
              { ( [ [ prev, ChevronLeftIcon, 'Previous' ], [ next, ChevronRightIcon, 'Next' ] ] as const ).map(
                ( [ id, Icon, label ] ) => (
                  <button
                    key= { label }
                    onClick= { () => navigateAdjacent( id ) }
                    disabled= { ! id }
                    title= { `${ label } [Ctrl + ${ label === 'Previous' ? '←' : '→' }]` }
                    aria-label= { label }
                    className= { BUTTON }
                  >
                    <Icon size= { 20 } />
                  </button>
                )
              ) }

              <button
                onClick= { toggleFullscreen }
                aria-pressed= { fullscreen }
                title= 'Toggle fullscreen [F11]'
                aria-label= 'Fullscreen'
                className= { BUTTON }
              >
                { fullscreen ? <Minimize2Icon size= { 20 } /> : <Maximize2Icon size= { 20 } /> }
              </button>
            </div>

            <div className= 'absolute inset-x-0 bottom-0 z-10 p-6 space-y-3'>
              <div className= 'min-w-0 pr-32'>
                <h1 className= 'truncate text-xl font-medium'>
                  { title }
                </h1>

                { media.creator && (
                  <p className= 'truncate text-sm text-slate-300'>
                    { media.creator }
                  </p>
                ) }
              </div>

              <Waveform
                mediaId= { media.id }
                duration= { displayDuration }
                currentTime= { currentTime }
                buffered= { buffered }
                onSeek= { seek }
              />

              <div className= 'flex justify-between items-center text-xs text-slate-300 tabular-nums'>
                <button
                  onClick= { () => setRemaining( v => ! v ) }
                  title= 'Switch elapsed / remaining time'
                  className= 'hover:text-white'
                >
                  { timeLabel }
                </button>

                <span>{ formatDuration( displayDuration * 1000 ) }</span>
              </div>

              <div className= 'flex justify-between items-center gap-12 mt-6'>
                <div className= 'flex items-center gap-2'>
                  <button
                    onClick= { togglePlay }
                    disabled= { ! ready }
                    title= 'Play / Pause [Space]'
                    aria-label= { playing ? 'Pause' : ended ? 'Replay' : 'Play' }
                    className= { BUTTON + ' size-12' }
                  >
                    { playing ? <PauseIcon size= { 22 } /> : ended ? <RotateCcwIcon size= { 22 } /> :
                      <PlayIcon size= { 22 } /> }
                  </button>

                  { ( [ [ -10, SkipBackIcon, 'Back', '←' ], [ 10, SkipForwardIcon, 'Forward', '→' ] ] as const ).map(
                    ( [ offset, Icon, direction, key ] ) => (
                      <button
                        key= { direction }
                        onClick= { () => seek( currentTime + offset ) }
                        title= { `${ direction } 10 seconds [${key}]` }
                        aria-label= { `${ direction } 10 seconds` }
                        className= { BUTTON }
                      >
                        <Icon size= { 18 } />
                      </button>
                    )
                  ) }
                </div>

                <div className= 'flex items-center gap-2'>
                  <VolumeControl
                    volume= { volume }
                    muted= { muted }
                    onVolumeChange= { changeVolume }
                    onVolumeCommit= { saveVolume }
                    onToggleMute= { toggleMute }
                  />

                  <PlaybackRateControl
                    rate= { rate }
                    onChange= { setPlaybackRate }
                  />
                </div>
              </div>
            </div>

            { streamError && (
              <div className= 'absolute inset-x-0 top-24 z-30 flex justify-center px-4'>
                <p role= 'alert' className= 'px-4 py-2 text-sm text-red-300 bg-slate-950/70 rounded'>
                  { streamError }
                </p>
              </div>
            ) }
          </>
        ) }
      </div>

      <audio ref= { mediaRef } preload= 'auto' />

      <MediaActions media= { media } />

      { playlistId && (
        <ActivePlaylist
          playlistId= { playlistId }
          mediaId= { media.id }
          orientation= 'horizontal'
        />
      ) }

      <hr className= 'border-dashed border-slate-700' />

      <Breadcrumbs
        items= { [ ...( directory?.breadcrumbs ?? [] ), { id: media.id, name: title, path: media.path } ] }
        onHome= { () => navigate( '/all' ) }
        onNavigate= { id => navigate( id ? `/all/${ media.rootId }/${ id }` : `/all/${ media.rootId }` ) }
      />

      <div className= 'space-y-3'>
        { categories.length > 0 && (
          <MediaTaxonomy type= 'category' items= { categories } />
        ) }

        <h1 className= 'text-2xl font-medium tracking-wide'>
          { title }
        </h1>
      </div>

      { media.description && (
        <p className= 'max-w-3xl text-lg leading-relaxed'>
          { media.description }
        </p>
      ) }

      <hr className= 'border-dashed border-slate-700' />

      <div className= 'space-y-8'>
        <MediaInfo media= { media } />

        { tags.length > 0 && (
          <MediaTaxonomy type= 'tag' items= { tags } />
        ) }
      </div>
    </div>
  );
}
