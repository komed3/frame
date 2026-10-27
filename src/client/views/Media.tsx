import { MediaBrowser } from '@/src/client/components/MediaBrowser';
import type { MediaDirectoryEntry } from '@/src/shared/types/directories';
import type { MediaRecord } from '@/src/shared/types/media';


export function Media () {
  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6'>
      <MediaBrowser
        directories= { [] }
        media= { [] }
        offset= { 0 }
        total= { 0 }
        onPageChange= { ( offset: number ) => undefined }
        onOpenDirectory= { ( directory: MediaDirectoryEntry ) => undefined }
        onOpenMedia= { ( media: MediaRecord ) => undefined }
      />
    </div>
  );
}
