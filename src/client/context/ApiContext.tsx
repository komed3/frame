import type {
  ApiHealth, ApiLogin, ApiLoginResult, ApiPage, ApiPreference, ApiPreferences,
  ApiSession, ApiStreamOptions, ApiDeleteResult, ApiFavorite
} from '@/src/shared/types/api';
import type { MediaRecord, MediaListOptions, MediaType, MediaUpdate } from '@/src/shared/types/media';
import type { MediaSearchOptions, MediaSearchResult } from '@/src/shared/types/search';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryTree } from '@/src/shared/types/directories';
import type { MediaRoot } from '@/src/shared/types/roots';
import type { TagRecord, CategoryRecord } from '@/src/shared/types/taxonomy';
import type { PlaylistRecord, PlaylistItemRecord, PlaylistUpdate } from '@/src/shared/types/playlists';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import type { MediaAssetRecord } from '@/src/shared/types/assets';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';


const API = '/api';
const TOKEN_KEY = 'frame.session';
