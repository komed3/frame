import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDateTime, formatDuration } from '@/src/client/utils/format';
import type { MarkerRecord } from '@/src/shared/types/markers';
import type { MediaRecord } from '@/src/shared/types/media';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';


interface MarkerPageData {
  markers: MarkerRecord[];
  media: Record< string, MediaRecord | null >;
}


export function Markers () {
  return (
    <></>
  );
}
