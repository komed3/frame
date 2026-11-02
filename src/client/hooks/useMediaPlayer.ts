import { useApi } from '@/src/client/context/ApiContext';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useRef, useState } from 'react';


type KeyControls = Record< string, ( e: KeyboardEvent ) => void >;

interface UseMediaPlayerOptions {
  previous?: string | null;
  next?: string | null;
  onNavigate?: ( id: string ) => void;
  extraControls?: KeyControls;
  errorMessage?: string;
}


export function useMediaPlayer < T extends HTMLMediaElement > ( media: MediaRecord, {
  previous = null, next = null, onNavigate, extraControls = {},
  errorMessage = 'Could not play this media file.'
}: UseMediaPlayerOptions = {} ) {}
