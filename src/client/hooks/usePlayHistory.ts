import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useCallback, useEffect, useRef, useState } from 'react';


export function usePlayHistory ( media: MediaRecord ) {
  const { plays, progress } = useApi();

  const [ positionMs, setPositionMs ] = useState< number | null >( null );
  const playIdRef = useRef< string | null >( null );
  const positionRef = useRef( 0 );
  const watchedMsRef = useRef( 0 );
  const lastTimeRef = useRef< number | null >( null );
  const lastSaveRef = useRef( 0 );
  const playingRef = useRef( false );
}
