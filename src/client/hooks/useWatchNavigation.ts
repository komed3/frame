import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import type { MediaRecord } from '@/src/shared/types/media';
import { useNavigate } from 'react-router';


export function useWatchNavigation ( media: MediaRecord, playlistId?: string ) {
  const { adjacentMedia } = useApi();
  const navigate = useNavigate();
}
