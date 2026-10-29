import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useNavigate } from 'react-router';


interface ImageViewerData {
  image: Blob;
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
}


export function ImageViewer ( { media }: { media: MediaRecord } ) {
  const { stream, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< ImageViewerData >( key, async signal => {
    const [ image, categories, tags, directory ] = await Promise.all( [
      stream( media.id, { signal } ).then( res => res.blob() ),
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] );

    return { image, categories, tags, directory };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;


  usePageTitle( media.title || media.fileName );


  return (
    <>
      <div className= 'h-[calc(100vh-64px)] bg-slate-950' />

      <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
        <MediaActions media= { media } />

        <hr className= 'border-dashed border-slate-700' />

        <Breadcrumbs
          items= { [
            ...( directory?.breadcrumbs ?? [] ),
            { id: media.id, name: media.title || media.fileName, path: media.path }
          ] }
          onHome= { () => navigate( '/all' ) }
          onNavigate= { id => navigate( id ? `/all/${ media.rootId }/${ id }` : `/all/${ media.rootId }` ) }
        />

        <div className= 'space-y-3'>
          { categories.length > 0 && (
            <MediaTaxonomy type= 'category' items= { categories } />
          ) }

          <h1 className= 'text-2xl font-medium tracking-wide'>
            { media.title || media.fileName }
          </h1>
        </div>

        { media.description && (
          <p className= 'max-w-3xl text-lg leading-relaxed'>
            { media.description }
          </p>
        ) }
      </div>
    </>
  );
}
