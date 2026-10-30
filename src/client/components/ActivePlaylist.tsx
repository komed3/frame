import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import type { MediaRecord } from '@/src/shared/types/media';
import { PauseIcon, PlayIcon, RepeatIcon, ShuffleIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';


interface ActivePlaylistProps {
  playlistId: string;
  mediaId: string;
  orientation?: 'horizontal' | 'vertical';
  ended?: boolean;
}

interface ActivePlaylistData {
  name: string;
  entries: MediaRecord[];
}

interface PlaylistSettings {
  shuffle: boolean;
  repeat: boolean;
}

interface DragState {
  x: number;
  scrollLeft: number;
  moved: boolean;
}


export function ActivePlaylist ( { playlistId, mediaId, orientation = 'horizontal', ended = false }: ActivePlaylistProps ) {
  const { media, playlists, prefs } = useApi();
  const navigate = useNavigate();

  const [ autoplay, setAutoplay ] = useState( true );
  const [ settings, setSettings ] = useState< PlaylistSettings >( JSON.parse(
    localStorage.getItem( 'frame.playlist.settings' ) || '{"shuffle":false,"repeat":false}' )
  );

  const drag = useRef< DragState | null >( null );
  const dragged = useRef( false );
  const endedRef = useRef( false );


  const { data, loading, error } = useApiData< ActivePlaylistData >( playlistId, async () => {
    const [ playlist, items ] = await Promise.all( [
      playlists.get( playlistId ), playlists.items( playlistId, { limit: 1000, offset: 0 } )
    ] );

    const entries = await Promise.all(
      items.sort( ( a, b ) => a.position - b.position ).map( i => media.get( i.mediaId ) )
    );

    return {
      name: playlist?.name ?? '',
      entries: entries.filter( ( item ): item is MediaRecord => !! item?.available )
    };
  } );


  const entries = data?.entries ?? [];
  const index = entries.findIndex( e => e.id === mediaId );
  const horizontal = orientation === 'horizontal';


  useEffect( () => { localStorage.setItem( 'frame.playlist.settings', JSON.stringify( settings ) ) }, [ settings ] );
  useEffect( () => { prefs.get( 'PLAYER_AUTOPLAY_NEXT' ).then( pref => setAutoplay( pref.value ) ) }, [ prefs ] );


  const open = useCallback( ( nextIndex: number ) => {
    const entry = entries[ nextIndex ];
    if ( entry ) navigate( `/watch/${ entry.id }/${ playlistId }` );
  }, [ entries, navigate, playlistId ] );


  const next = useCallback( ( auto = false ) => {
    if ( index < 0 || ! entries.length ) return;
    if ( auto && ( ! autoplay || ! [ 'audio', 'video' ].includes( entries[ index ].type ) ) ) return;

    if ( settings.shuffle && entries.length > 1 ) {
      const choices = entries.map( ( _, i ) => i ).filter( i => i !== index );
      open( choices[ Math.floor( Math.random() * choices.length ) ] );
    }

    else if ( index < entries.length - 1 ) open( index + 1 );
    else if ( settings.repeat ) open( 0 );
  }, [ autoplay, entries, index, open, settings ] );


  useEffect( () => {
    if ( ended && ! endedRef.current ) next( true );
    endedRef.current = ended;
  }, [ ended, next ] );


  return data && entries.length > 0 && (
    <div className= 'flex flex-col gap-4 w-full max-w-full min-w-0 p-4 bg-slate-50/5 rounded shadow-lg'>
      <div className= 'flex justify-between items-center gap-4'>
        <Link
          to= { `/playlist/${ playlistId }` }
          className= 'min-w-0 truncate font-medium'
        >
          { data.name }
        </Link>

        <span className= 'shrink-0 text-sm tabular-nums text-slate-400'>
          { index + 1 } / { entries.length }
        </span>
      </div>
    </div>
  );
}
