import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatBytes, formatDuration, formatFileFormat, formatMediaType } from '@/src/client/utils/format';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaRecord } from '@/src/shared/types/media';
import type { PlaylistItemRecord, PlaylistRecord } from '@/src/shared/types/playlists';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, CheckIcon, ChevronLeftIcon, FileIcon, PencilIcon, PlayIcon, Trash2Icon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


interface PlaylistPageData {
  playlist: PlaylistRecord;
  items: ( PlaylistItemRecord & { media: MediaRecord | null } )[];
}


const ACTION_BUTTON =
  'flex justify-center items-center gap-2 px-3.5 py-2.5 text-sm bg-slate-50/10 rounded ' +
  'transition-colors hover:bg-slate-50/20 disabled:opacity-40 disabled:pointer-events-none';

const ITEM_BUTTON =
  'p-2 text-slate-400 rounded transition-colors hover:bg-slate-50/10 ' +
  'disabled:opacity-30 disabled:pointer-events-none';


export function Playlist () {
  const { playlistId } = useParams();
  const { playlists, search } = useApi();
  const navigate = useNavigate();

  const [ refresh, setRefresh ] = useState( 0 );
  const [ editing, setEditing ] = useState( false );
  const [ name, setName ] = useState( '' );
  const [ description, setDescription ] = useState( '' );
  const [ saving, setSaving ] = useState( false );
  const [ busy, setBusy ] = useState< string | null >( null );
  const [ actionError, setActionError ] = useState< string | null >( null );


  const key = `${ playlistId ?? '' }:${ refresh }`;
  const { data, loading, error } = useApiData< PlaylistPageData | null >( key, async () => {
    if ( ! playlistId ) return null;

    const playlist = await playlists.get( playlistId );
    if ( ! playlist ) return null;

    const items: PlaylistItemRecord[] = [];
    let offset = 0;

    while ( true ) {
      const page = await playlists.items( playlistId, { limit: 500, offset } );
      items.push( ...page ), offset += page.length;

      if ( page.length < 500 ) break;
    }

    const results = await Promise.all( Array.from( { length: Math.ceil( items.length / 500 ) }, ( _, i ) => search( {
      ids: items.slice( i * 500, ( i + 1 ) * 500 ).map( item => item.mediaId ), limit: 500
    } ) ) );

    const mediaById = new Map< string, MediaRecord >();
    results.forEach( res => res.items.forEach( i => mediaById.set( i.id, i ) ) );

    return { playlist, items: items.map( i => ( { ...i, media: mediaById.get( i.mediaId ) ?? null } ) ) };
  } );


  usePageTitle( data?.playlist.name ?? 'Playlist' );


  const edit = () => {
    if ( ! data ) return;
    setName( data.playlist.name ), setDescription( data.playlist.description ?? '' );
    setEditing( true ), setActionError( null );
  };

  const save = async ( e: SubmitEvent ) => {
    e.preventDefault();
    if ( ! playlistId || ! name.trim() || saving ) return;

    setSaving( true ), setActionError( null );

    try {
      await playlists.update( playlistId, { name: name.trim(), description: description.trim() || null } );
      setEditing( false ), setRefresh( v => v + 1 );
    }

    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not update playlist.' ) }
    finally { setSaving( false ) }
  };

  const removePlaylist = async () => {
    if ( ! playlistId || busy || ! window.confirm( `Delete playlist "${ data?.playlist.name }"?` ) ) return;

    setBusy( 'playlist' ), setActionError( null );

    try { await playlists.delete( playlistId ); navigate( '/playlists' ) }
    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not delete playlist.' ) }
    finally { setBusy( null ) }
  };

  const removeItem = async ( mediaId: string ) => {
    if ( ! playlistId || busy ) return;

    setBusy( mediaId ), setActionError( null );

    try { await playlists.remove( playlistId, mediaId ); setRefresh( v => v + 1 ) }
    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not remove media.' ) }
    finally { setBusy( null ) }
  };

  const moveItem = async ( mediaId: string, position: number ) => {
    if ( ! playlistId || busy ) return;

    setBusy( mediaId ), setActionError( null );

    try { await playlists.move( playlistId, mediaId, position ); setRefresh( v => v + 1 ) }
    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not move media.' ) }
    finally { setBusy( null ) }
  };


  if ( error ) return (
    <div className= 'mx-auto my-12 max-w-7xl px-6'>
      <p role= 'alert' className= 'py-16 text-center text-red-400'>
        { error }
      </p>
    </div>
  );

  if ( loading ) return <Loading className= 'min-h-[50vh]' />;
  if ( ! data ) return <NotFound />;


  const { playlist, items } = data;
  const firstMedia = items.find( i => i.media )?.media ?? null;
  const duration = items.reduce( ( total, i ) => total + ( i.media?.durationMs ?? 0 ), 0 );


  return (
    <div className= 'mx-auto my-12 max-w-7xl space-y-10 px-6'>
      <Link
        to= '/playlists'
        className= 'inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white'
      >
        <ArrowLeftIcon size= { 16 } />
        <span>Back to playlists</span>
      </Link>

      { actionError && (
        <p role= 'alert' className= 'text-sm text-red-400'>
          { actionError }
        </p>
      ) }

      <div className= 'flex items-start gap-12'>
        <div className= 'w-100 p-6 pt-5 space-y-6 bg-slate-800 rounded shadow-lg'>
          { firstMedia && firstMedia.hasThumbnail && (
            <MediaThumbnail media= { firstMedia } />
          ) }

          <div className= 'space-y-2'>
            <h1 className= 'text-xl font-medium'>
              { playlist.name }
            </h1>

            { playlist.description && (
              <p className= 'text-sm leading-relaxed text-slate-400'>
                { playlist.description }
              </p>
            ) }
          </div>

          <div className= 'grid grid-cols-2 gap-4'>
            <div className= 'flex flex-col'>
              <span className= 'text-[11px] uppercase tracking-wider text-slate-500'>
                Media
              </span>

              <b className= 'font-medium tabular-nums'>
                { items.length }
              </b>
            </div>

            <div className= 'flex flex-col'>
              <span className= 'text-[11px] uppercase tracking-wider text-slate-500'>
                Duration
              </span>

              <b className= 'font-medium tabular-nums'>
                { formatDuration( duration ) }
              </b>
            </div>
          </div>

          <div className= 'grid grid-cols-2 gap-2'>
            <button onClick= { edit } className= { ACTION_BUTTON }>
              <PencilIcon size= { 16 } />
              <span>Edit</span>
            </button>

            <button
              onClick= { removePlaylist } disabled= { busy !== null }
              className= { ACTION_BUTTON + ' text-red-400 hover:text-red-300' }
            >
              <Trash2Icon size= { 16 } />
              <span>Delete playlist</span>
            </button>

            <button
              onClick= { () => firstMedia && navigate( `/watch/${ firstMedia.id }/${ playlistId }` ) }
              disabled= { ! firstMedia }
              className= { ACTION_BUTTON + ' col-span-2' }
            >
              <PlayIcon size= { 16 } />
              <span>Play</span>
            </button>
          </div>
        </div>

        <div className= 'flex-1 space-y-6'>
          <h2 className= 'text-lg font-medium'>
            Media
          </h2>

          { ! items.length ? (
            <p className= 'py-16 text-center text-slate-400 bg-slate-900/40 rounded'>
              This playlist is empty.
            </p>
          ) : (
            <div className= 'overflow-hidden bg-slate-900/40 divide-y divide-slate-700/70 rounded shadow-lg'>
              { items.map( ( { mediaId, media }, i ) => (
                <div
                  key= { mediaId }
                  className= 'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50/5'
                >
                  { media ? (
                    <Link
                      to= { `/watch/${ media.id }/${ playlistId }` }
                      className= 'group flex-1 flex items-center gap-4 min-w-0'
                    >
                      <div className= 'shrink-0 w-28'>
                        <MediaThumbnail media= { media } />
                      </div>

                      <div className= 'flex-1 min-w-0 space-y-1'>
                        <p className= 'truncate text-sm font-medium transition-colors group-hover:text-sky-400'>
                          { media.title || media.fileName }
                        </p>

                        <div className= 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400'>
                          <span className= 'flex items-center gap-1.5'>
                            <MediaIcon type= { media.type } size= { 14 } />
                            { formatMediaType( media.type ) }
                          </span>

                          <span>{ formatFileFormat( media.fileName, media.container ) }</span>

                          { ( media.type === 'video' || media.type === 'audio' ) && (
                            <span className= 'tabular-nums'>
                              { formatDuration( media.durationMs ) }
                            </span>
                          ) }

                          <span className= 'tabular-nums'>
                            { formatBytes( media.sizeBytes ) }
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className= 'flex flex-1 items-center gap-4 min-w-0'>
                      <div className= 'shrink-0 flex justify-center items-center w-28 aspect-video bg-slate-50/5 rounded'>
                        <FileIcon size= { 26 } className= 'opacity-25' />
                      </div>

                      <span className= 'text-sm text-slate-500'>
                        Unavailable media
                      </span>
                    </div>
                  ) }

                  <div className= 'flex items-center gap-1 shrink-0'>
                    <button
                      onClick= { () => moveItem( mediaId, i - 1 ) }
                      disabled= { i === 0 || busy !== null }
                      aria-label= 'Move up' title= 'Move up'
                      className= { ITEM_BUTTON }
                    >
                      <ArrowUpIcon size= { 16 } />
                    </button>

                    <button
                      onClick= { () => moveItem( mediaId, i + 1 ) }
                      disabled= { i === items.length - 1 || busy !== null }
                      aria-label= 'Move down' title= 'Move down'
                      className= { ITEM_BUTTON }
                    >
                      <ArrowDownIcon size= { 16 } />
                    </button>

                    <button
                      onClick= { () => removeItem( mediaId ) }
                      disabled= { busy !== null }
                      aria-label= 'Remove from playlist' title= 'Remove from playlist'
                      className= { ITEM_BUTTON + ' hover:text-red-400' }
                    >
                      <Trash2Icon size= { 16 } />
                    </button>
                  </div>
                </div>
              ) ) }
            </div>
          ) }
        </div>
      </div>

      { editing && (
        <>
          <div
            className= 'fixed inset-0 z-40 bg-slate-900 opacity-50'
            onClick= { () => ! saving && setEditing( false ) }
          />
        </>
      ) }
    </div>
  );
}
