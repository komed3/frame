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


export function ActivePlaylist ( { playlistId, mediaId, orientation = 'horizontal' }: ActivePlaylistProps ) {
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


  return (
    <div className= 'bg-slate-50/10 rounded shadow-lg'></div>
  );
}
