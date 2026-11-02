import { useApi } from '@/src/client/context/ApiContext';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useRef, useState } from 'react';
