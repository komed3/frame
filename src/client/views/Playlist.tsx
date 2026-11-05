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
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PencilIcon, PlayIcon, Trash2Icon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


interface PlaylistPageData {
  playlist: PlaylistRecord;
  items: ( PlaylistItemRecord & { media: MediaRecord | null } )[];
}


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
    <div className= 'flex items-start gap-6 mx-auto my-12 max-w-7xl px-6'>
      <div className= 'w-100 p-6 space-y-5 bg-slate-800 rounded shadow-lg'></div>

      <div className= 'flex-1'></div>
    </div>
  );
}
