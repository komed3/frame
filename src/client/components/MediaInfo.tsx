import { formatBytes, formatDate, formatFileFormat } from '@/src/client/utils/format';
import type { MediaRecord } from '@/src/shared/types/media';


interface MediaInfoProps {
  media: MediaRecord;
}


export function MediaInfo ( { media }: MediaInfoProps ) {}
