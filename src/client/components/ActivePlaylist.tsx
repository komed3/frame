import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import type { PlaylistItemRecord, PlaylistRecord } from '@/src/shared/types/playlists';
import { ArrowDownIcon, ArrowUpIcon, PauseIcon, PlayIcon, RepeatIcon, ShuffleIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';


interface ActivePlaylistProps {
  playlistId: string;
  mediaId: string;
  orientation?: 'horizontal' | 'vertical';
}


export function ActivePlaylist ( { playlistId, mediaId, orientation = 'horizontal' }: ActivePlaylistProps ) {
  return (
    <div className= 'bg-slate-50/10 rounded shadow-lg'></div>
  );
}
