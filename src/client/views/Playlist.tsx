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

  return (
    <></>
  );
}
