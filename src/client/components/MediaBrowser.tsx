import { useApi } from '@/src/client/context/ApiContext';
import { Pagination, MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import { FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon, FolderIcon } from 'lucide-react';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord, MediaType } from '@/src/shared/types/media';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat, formatMediaType } from '@/src/client/utils/format';
import { useEffect, useState } from 'react';


interface MediaBrowserProps {
  directories?: MediaDirectoryEntry[];
  media: MediaRecord[];
  offset: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  onPageChange: ( offset: number ) => void;
  onOpenDirectory?: ( directory: MediaDirectoryEntry ) => void;
  onOpenMedia: ( media: MediaRecord ) => void;
}
