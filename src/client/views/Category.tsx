import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import { MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaSearchResult } from '@/src/shared/types/search';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { FolderIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


export function Category () {
  return (
    <></>
  );
}
