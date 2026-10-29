import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useNavigate } from 'react-router';


interface TextViewerData {
  content: string;
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
}


export function TextViewer ( { media }: { media: MediaRecord } ) {
  const { stream, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< TextViewerData >( key, async signal => {
    const [ content, categories, tags, directory ] = await Promise.all( [
      stream( media.id, { signal } ).then( res => res.text() ),
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null )
    ] );

    return { content, categories, tags, directory };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;


  usePageTitle( media.title || media.fileName );


  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <Breadcrumbs
        items= { [ ...( directory?.breadcrumbs ?? [] ), {
          id: media.id, name: media.title || media.fileName, path: media.path
        } ] }
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

      <div className= 'flex items-start gap-20'>
        <div className= 'flex-1 min-w-0'>
          { loading ? (
            <Loading size= { 32 } className= 'min-h-64' />
          ) : error ? (
            <p role= 'alert' className= 'py-12 font-semibold text-red-400'>
              { error }
            </p>
          ) : (
            <pre className= 'font-sans text-normal whitespace-pre-wrap wrap-break-word leading-relaxed'>
              { data?.content ?? '' }
            </pre>
          ) }
        </div>

        <aside className= 'shink-0 w-80' />
      </div>

      <hr className= 'border-dashed border-slate-700' />

      <div className= 'space-y-8'>
        <MediaActions media= { media } />
        <MediaInfo media= { media } />

        { media.description && (
          <p className= 'max-w-3xl text-lg leading-relaxed'>
            { media.description }
          </p>
        ) }

        { tags.length > 0 && (
          <MediaTaxonomy type= 'tag' items= { tags } />
        ) }
      </div>
    </div>
  );
}
