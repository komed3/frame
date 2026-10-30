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
import { Maximize2Icon, Minimize2Icon, ScanIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
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


const BUTTON = 'p-2 rounded hover:bg-white/20';


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

  useEffect( () => {
    const vp = viewportRef.current;
    if ( ! vp ) return;

    const handleWheel = ( e: WheelEvent ) => {
      if ( mode !== 'zoom' ) return;

      e.preventDefault();
      wheelRef.current.delta += e.deltaY * ( e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vp.clientHeight : 1 );
      wheelRef.current.x = e.clientX - vp.getBoundingClientRect().left;
      wheelRef.current.y = e.clientY - vp.getBoundingClientRect().top;

      if ( wheelRef.current.frame ) return;

      wheelRef.current.frame = requestAnimationFrame( () => {
        const { delta, x, y } = wheelRef.current;
        wheelRef.current.delta = 0;
        wheelRef.current.frame = 0;
        changeZoom( Math.exp( -delta * 0.0015 ), x, y );
      } );
    };

    vp.addEventListener( 'wheel', handleWheel, { passive: false } );
    return () => vp.removeEventListener( 'wheel', handleWheel );
  }, [ mode, zoom, imageSize ] );


  usePageTitle( media.title || media.fileName );


  const setView = ( next: 'fit' | 'fill' | 'zoom' ) => {
    setMode( next ), setPointer( null ), setDragging( false );
    dragRef.current.active = false;
  };

  const getFitZoom = () => {
    const viewport = viewportRef.current;
    return viewport && imageSize.width && imageSize.height ? Math.min(
      viewport.clientWidth / imageSize.width, viewport.clientHeight / imageSize.height, 1
    ) : 1;
  };

  const changeZoom = ( factor: number, x?: number, y?: number ) => {
    const vp = viewportRef.current, image = imageRef.current;
    if ( ! vp || ! image ) return;

    const rect = vp.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const base = mode === 'zoom' ? zoomRef.current : getFitZoom();
    const next = Math.max( 0.05, Math.min( 32, base * factor ) );
    const px = x ?? rect.width / 2, py = y ?? rect.height / 2;
    const imageX = ( px - imageRect.left + rect.left ) / base;
    const imageY = ( py - imageRect.top + rect.top ) / base;

    zoomRef.current = next;
    setZoom( next ), setMode( 'zoom' );

    requestAnimationFrame( () => {
      vp.scrollLeft = Math.max( ( vp.clientWidth - imageSize.width * next ) / 2, 0 ) + imageX * next - px;
      vp.scrollTop = Math.max( ( vp.clientHeight - imageSize.height * next ) / 2, 0 ) + imageY * next - py;
    } );
  };

  const toggleZoom = () => {
    if ( mode === 'zoom' ) return setView( 'fit' );

    zoomRef.current = getFitZoom();
    setZoom( zoomRef.current ), setView( 'zoom' );
  };

  const handlePointerDown = ( e: React.PointerEvent< HTMLDivElement > ) => {
    if ( e.button !== 0 || e.target !== imageRef.current ) return;

    const vp = viewportRef.current;
    if ( ! vp ) return;

    dragRef.current = { active: true, moved: false, x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop };
    setDragging( mode === 'zoom' );
    e.currentTarget.setPointerCapture( e.pointerId );
  };

  const handlePointerMove = ( e: React.PointerEvent< HTMLDivElement > ) => {
    const vp = viewportRef.current, image = imageRef.current;
    if ( ! vp || ! image ) return;

    if ( dragRef.current.active ) {
      const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;

      if ( Math.abs( dx ) + Math.abs( dy ) > 3 ) dragRef.current.moved = true;
      if ( mode === 'zoom' ) {
        vp.scrollLeft = dragRef.current.left - dx;
        vp.scrollTop = dragRef.current.top - dy;
      }
    }

    if ( ! magnifier ) return;

    const rect = vp.getBoundingClientRect(), imageRect = image.getBoundingClientRect();
    const scale = mode === 'zoom' ? imageRect.width / imageSize.width : ( mode === 'fit'
      ? Math.min( rect.width / imageSize.width, rect.height / imageSize.height )
      : Math.max( rect.width / imageSize.width, rect.height / imageSize.height ) );

    setPointer( {
      x: e.clientX - rect.left, y: e.clientY - rect.top,
      left: imageRect.left - rect.left + ( imageRect.width - imageSize.width * scale ) / 2,
      top: imageRect.top - rect.top + ( imageRect.height - imageSize.height * scale ) / 2,
      width: imageSize.width * scale, height: imageSize.height * scale
    } );
  };

  const handlePointerUp = () => {
    const { active, moved } = dragRef.current;

    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging( false );

    if ( active && ! moved && magnifier ) setMagnifier( c => c === 2 ? 4 : c === 4 ? 8 : 2 );
  };

  const handlePointerCancel = () => {
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging( false );
  };

  const toggleFullscreen = () => {
    document.fullscreenElement ? document.exitFullscreen() : viewerRef.current?.requestFullscreen();
  };


  return (
    <>
      <div
        ref= { viewerRef }
        className= 'relative h-[calc(100vh-64px)] bg-slate-950 overflow-hidden'
      >
        { loading && <Loading className= 'h-full' /> }

        { error && (
          <div className= 'flex justify-center items-center h-full font-semibold text-red-400'>
            { error }
          </div>
        ) }

        { imageUrl && (
          <>
            <div
              className= {
                'absolute right-4 bottom-4 z-2 flex items-center gap-1 p-1 rounded-lg ' +
                'bg-slate-50/10 backdrop-blur'
              }
            >
              <button
                onClick= { () => setView( 'fit' ) }
                title= 'Fit to screen'
                className= { BUTTON }
              >
                <Minimize2Icon size= { 18 } />
              </button>

              <button
                onClick= { () => setView( 'fill' ) }
                title= 'Fill screen'
                className= { BUTTON }
              >
                <Maximize2Icon size= { 18 } />
              </button>

              <button
                onClick= { () => { zoomRef.current = 1, setZoom( 1 ), setView( 'zoom' ) } }
                title= 'Zoom to 100% (1:1)'
                className= { BUTTON }
              >
                <ScanIcon size= { 18 } />
              </button>

              { mode === 'zoom' && (
                <>
                  <button
                    onClick= { () => changeZoom( 0.8 ) }
                    title= 'Zoom out'
                    className= { BUTTON }
                  >
                    <ZoomOutIcon size= { 18 } />
                  </button>

                  <button
                    onClick= { () => changeZoom( 1.25 ) }
                    title= 'Zoom in'
                    className= { BUTTON }
                  >
                    <ZoomInIcon size= { 18 } />
                  </button>
                </>
              ) }
            </div>
          </>
        ) }
      </div>

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
