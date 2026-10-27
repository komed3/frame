import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { Pagination, MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord } from '@/src/shared/types/media';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat } from '@/src/client/utils/format';
import { FolderIcon } from 'lucide-react';
import { useState } from 'react';


export function MediaBrowser () {
  return (
    <></>
  );
}
