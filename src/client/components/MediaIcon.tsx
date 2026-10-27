import type { MediaType } from '@/src/shared/types/media';
import { FileIcon, HeadphonesIcon, ImageIcon, SquarePlayIcon, SquareTextIcon } from 'lucide-react';
import type { ComponentProps } from 'react';


type MediaIconProps = ComponentProps< typeof FileIcon > & {
  type: MediaType;
};


export function MediaIcon ( { type, ...props }: MediaIconProps ) {
  const p = { ...{ size: 20 }, ...props };

  switch ( type ) {
    case 'video': return <SquarePlayIcon { ...p } />;
    case 'audio': return <HeadphonesIcon { ...p } />;
    case 'image': return <ImageIcon { ...p } />;
    case 'text': return <SquareTextIcon { ...p } />;
    default: return <FileIcon { ...p } />;
  }
}
