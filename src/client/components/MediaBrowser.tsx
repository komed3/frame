import { useApi } from '@/src/client/context/ApiContext';
import { Pagination, MEDIA_PAGE_SIZE } from '@/src/client/components/Pagination';
import { ViewToggle, type MediaViewMode } from '@/src/client/components/ViewToggle';
import { FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon, FolderIcon } from 'lucide-react';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord, MediaType } from '@/src/shared/types/media';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatFileFormat, formatMediaType } from '@/src/client/utils/format';
import { useEffect, useState } from 'react';
