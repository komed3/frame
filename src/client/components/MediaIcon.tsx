import type { MediaType } from '@/src/shared/types/media';
import { FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon } from 'lucide-react';
import type { ComponentProps } from 'react';


type MediaIconProps = ComponentProps< typeof FileIcon > & {
  type: MediaType;
};


export function MediaIcon ( { type, ...props }: MediaIconProps ) {
  const p = { ...{ size: 20, className: 'text-slate-400' }, ...props };

  switch ( type ) {
    case 'video': return <FileVideoIcon { ...p } />;
    case 'audio': return <FileAudioIcon { ...p } />;
    case 'image': return <FileImageIcon { ...p } />;
    case 'text': return <FileTextIcon { ...p } />;
    default: return <FileIcon { ...p } />;
  }
}
