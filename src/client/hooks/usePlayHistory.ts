import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useCallback, useEffect, useRef, useState } from 'react';


export function usePlayHistory ( media: MediaRecord ) {
  const { plays, progress } = useApi();
  const hasPlayback = media.type === 'audio' || media.type === 'video';

  const [ positionMs, setPositionMs ] = useState< number | null >( null );
  const playId = useRef< string | null >( null );
  const watchedMs = useRef( 0 );
  const position = useRef( 0 );
  const lastTime = useRef< number | null >( null );
  const lastSave = useRef( 0 );
  const playing = useRef( false );
}
