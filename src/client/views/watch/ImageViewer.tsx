import type { MediaRecord } from '@/src/shared/types/media';


export function ImageViewer ( { media }: { media: MediaRecord } ) {
  return (
    <>
      <div className= 'h-[calc(100vh-64px)] bg-slate-950' />

      <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
        ...
      </div>
    </>
  );
}
