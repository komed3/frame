import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import type { MediaRecord } from '@/src/shared/types/media';
import { useNavigate } from 'react-router';


export function useWatchNavigation ( media: MediaRecord, playlistId?: string ) {
  const { adjacentMedia } = useApi();
  const navigate = useNavigate();


  const key = `${ media.id }:${ playlistId ?? '' }`;
  const { data } = useApiData< [ string | null, string | null ] >( key, () => adjacentMedia( media, playlistId ) );
  const [ prev, next ] = data ?? [ null, null ];
}
