import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { MediaType } from '@/src/shared/types/media';
import type { MediaSearchOptions, MediaSearchProgress, MediaSearchQueryMode, MediaSearchSort } from '@/src/shared/types/search';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
