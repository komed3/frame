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

  return (
    <div className= 'bg-slate-50/10 rounded shadow-lg'></div>
  );
}
