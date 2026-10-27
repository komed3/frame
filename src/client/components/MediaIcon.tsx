import type { MediaType } from '@/src/shared/types/media';
import { FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon } from 'lucide-react';


export function MediaIcon ( { type }: { type: MediaType } ) {
  const props = { size: 18, className: 'shrink-0 text-slate-400' };

  switch ( type ) {
    case 'video': return <FileVideoIcon { ...props } />;
    case 'audio': return <FileAudioIcon { ...props } />;
    case 'image': return <FileImageIcon { ...props } />;
    case 'text':  return <FileTextIcon { ...props } />;
    default:      return <FileIcon { ...props } />;
  }
}
