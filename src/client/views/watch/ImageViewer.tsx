import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';


interface ImageViewerData {
  image: Blob;
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
}

interface MagnifierPosition {
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
}


export function ImageViewer ( { media }: { media: MediaRecord } ) {
  const { stream, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();


  const viewerRef = useRef< HTMLDivElement >( null );
  const viewportRef = useRef< HTMLDivElement >( null );
  const imageRef = useRef< HTMLImageElement >( null );
  const zoomRef = useRef( 1 );
  const dragRef = useRef( { active: false, moved: false, x: 0, y: 0, left: 0, top: 0 } );
  const wheelRef = useRef( { frame: 0, delta: 0, x: 0, y: 0 } );

  const [ mode, setMode ] = useState< 'fit' | 'fill' | 'zoom' >( 'fit' );
  const [ zoom, setZoom ] = useState( 1 );
  const [ imageSize, setImageSize ] = useState( { width: media.width || 0, height: media.height || 0 } );
  const [ dragging, setDragging ] = useState( false );
  const [ magnifier, setMagnifier ] = useState< 0 | 2 | 4 | 8 >( 0 );
  const [ pointer, setPointer ] = useState< MagnifierPosition | null >( null );


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

  const imageUrl = useMemo( () => data?.image ? URL.createObjectURL( data.image ) : '', [ data?.image ] );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;


  useEffect( () => { if ( imageUrl ) URL.revokeObjectURL( imageUrl ) }, [ imageUrl ] );
  useEffect( () => cancelAnimationFrame( wheelRef.current.frame ), [] );

  useEffect( () => {
    const handleKeyDown = ( e: KeyboardEvent ) => {
      if ( e.key === 'Escape' && magnifier ) setMagnifier( 0 );
      if ( e.key === 'F11' ) e.preventDefault(), document.fullscreenElement
        ? document.exitFullscreen() : viewerRef.current?.requestFullscreen();
    };

    document.addEventListener( 'keydown', handleKeyDown );
    return () => document.removeEventListener( 'keydown', handleKeyDown );
  }, [ magnifier ] );


  usePageTitle( media.title || media.fileName );


  return (
    <>
      <div className= 'h-[calc(100vh-64px)] bg-slate-950' />

      <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
        <MediaActions media= { media } />

        <hr className= 'border-dashed border-slate-700' />

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

        { media.description && (
          <p className= 'max-w-3xl text-lg leading-relaxed'>
            { media.description }
          </p>
        ) }

        <hr className= 'border-dashed border-slate-700' />

        <div className= 'space-y-8'>
          <MediaInfo media= { media } />

          { tags.length > 0 && (
            <MediaTaxonomy type= 'tag' items= { tags } />
          ) }
        </div>
      </div>
    </>
  );
}
