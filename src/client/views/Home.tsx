import { Loading } from '@/src/client/components/Loading';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatBytes, formatDateTime, formatDuration, formatNumber } from '@/src/client/utils/format';
import type { MediaRecord, MediaStats } from '@/src/shared/types/media';
import type { HistoryRecord } from '@/src/shared/types/plays';
import type { PlaylistRecord } from '@/src/shared/types/playlists';
import type { ProgressRecord } from '@/src/shared/types/progress';
import { ArrowRightIcon, ListVideoIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Home () {
  return (
    <></>
  );
}
