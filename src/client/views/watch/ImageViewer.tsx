import { ActivePlaylist } from '@/src/client/components/ActivePlaylist';
import { Breadcrumbs } from '@/src/client/components/Breadcrumbs';
import { Loading } from '@/src/client/components/Loading';
import { MediaActions } from '@/src/client/components/MediaActions';
import { MediaInfo } from '@/src/client/components/MediaInfo';
import { MediaTaxonomy } from '@/src/client/components/MediaTaxonomy';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useKeyControls } from '@/src/client/hooks/useKeyControls';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import {
  ExpandIcon, Maximize2Icon, Minimize2Icon, MoveIcon, ScanEyeIcon,
  ScanIcon, ShrinkIcon, ZoomInIcon, ZoomOutIcon
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';


interface ImageViewerProps {
  media: MediaRecord;
  playlistId?: string;
}

type MagnifierLevel = 0 | 2 | 4 | 6 | 8;

interface ImageViewerData {
  image: Blob;
  categories: CategoryRecord[];
  tags: TagRecord[];
  directory: ApiDirectoryListResult | null;
  prev: string | null;
  next: string | null;
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


export function ImageViewer ( { media, playlistId }: ImageViewerProps ) {
  const { stream, media: mediaApi, directories, playlists } = useApi();
  const navigate = useNavigate();


  const viewerRef = useRef< HTMLDivElement >( null );
  const vpRef = useRef< HTMLDivElement >( null );
  const imageRef = useRef< HTMLImageElement >( null );
  const zoomRef = useRef( 1 );
  const dragRef = useRef( { active: false, moved: false, x: 0, y: 0, left: 0, top: 0 } );
  const wheelRef = useRef( { frame: 0, delta: 0, x: 0, y: 0 } );

  const [ imageUrl, setImageUrl ] = useState( '' );
  const [ mode, setMode ] = useState< 'fit' | 'fill' | 'zoom' >( 'fit' );
  const [ zoom, setZoom ] = useState( 1 );
  const [ fullscreen, setFullscreen ] = useState( false );
  const [ imageSize, setImageSize ] = useState( { width: media.width || 0, height: media.height || 0 } );
  const [ dragging, setDragging ] = useState( false );
  const [ magnifier, setMagnifier ] = useState< MagnifierLevel >( 0 );
  const [ pointer, setPointer ] = useState< MagnifierPosition | null >( null );


  const key = JSON.stringify( [ media.id, media.rootId, media.directoryId ] );
  const { data, loading, error } = useApiData< ImageViewerData >( key, async signal => {
    const [ image, categories, tags, directory, prev, next ] = await Promise.all( [
      stream( media.id, { signal } ).then( res => res.blob() ),
      mediaApi.categories( media.id ).catch( () => [] ),
      mediaApi.tags( media.id ).catch( () => [] ),
      directories.list( media.rootId, media.directoryId ).catch( () => null ),
      playlistId
        ? playlists.prev( playlistId, media.id ).then( item => item?.mediaId ?? null )
        : mediaApi.prev( media.id ).then( item => item?.id ?? null ),
      playlistId
        ? playlists.next( playlistId, media.id ).then( item => item?.mediaId ?? null )
        : mediaApi.next( media.id ).then( item => item?.id ?? null )
    ] );

    return { image, categories, tags, directory, prev, next };
  } );

  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];
  const directory = data?.directory ?? null;
  const prev = data?.prev ?? null;
  const next = data?.next ?? null;

  useEffect( () => {
    if ( ! data?.image ) return;

    const url = URL.createObjectURL( data.image );
    setImageUrl( url );

    return () => URL.revokeObjectURL( url );
  }, [ data?.image ] );

  useEffect( () => cancelAnimationFrame( wheelRef.current.frame ), [] );

  useEffect( () => {
    const handleFullscreenChange = () => setFullscreen( !! document.fullscreenElement );
    document.addEventListener( 'fullscreenchange', handleFullscreenChange );
    return () => document.removeEventListener( 'fullscreenchange', handleFullscreenChange );
  }, [] );

  useEffect( () => {
    const vp = vpRef.current;
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
    const viewport = vpRef.current;
    return viewport && imageSize.width && imageSize.height ? Math.min(
      viewport.clientWidth / imageSize.width, viewport.clientHeight / imageSize.height, 1
    ) : 1;
  };

  const changeZoom = ( factor: number, x?: number, y?: number ) => {
    const vp = vpRef.current, image = imageRef.current;
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

    const vp = vpRef.current;
    if ( ! vp ) return;

    dragRef.current = { active: true, moved: false, x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop };
    setDragging( mode === 'zoom' );
    e.currentTarget.setPointerCapture( e.pointerId );
  };

  const handlePointerMove = ( e: React.PointerEvent< HTMLDivElement > ) => {
    const vp = vpRef.current, image = imageRef.current;
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

    if ( active && ! moved && magnifier ) setMagnifier(
      c => c === 2 ? 4 : c === 4 ? 6 : c === 6 ? 8 : 2
    );
  };

  const handlePointerCancel = () => {
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging( false );
  };

  const toggleFullscreen = () => {
    document.fullscreenElement ? document.exitFullscreen() : viewerRef.current?.requestFullscreen();
  };


  useKeyControls( {
    f11: toggleFullscreen, escape: () => { if ( magnifier ) setMagnifier( 0 ), setPointer( null ) },
    '0': () => setView( 'fit' ), f: () => setView( 'fill' ),
    '1': () => { zoomRef.current = 1, setZoom( 1 ), setView( 'zoom' ) },
    z: toggleZoom, '+': () => changeZoom( 1.25 ), '=': () => changeZoom( 1.25 ), '-': () => changeZoom( 0.8 ),
    m: () => { setMagnifier( c => c ? 0 : 2 ), setPointer( null ) },
    '[': () => setMagnifier( c => Math.max( c - 2, 2 ) as MagnifierLevel ),
    ']': () => setMagnifier( c => Math.min( c + 2, 8 ) as MagnifierLevel ),
    arrowup: e => { mode === 'zoom' && vpRef.current && ( vpRef.current.scrollTop -= e.shiftKey ? 160 : 40 ) },
    arrowdown: e => { mode === 'zoom' && vpRef.current && ( vpRef.current.scrollTop += e.shiftKey ? 160 : 40 ) },
    arrowleft: e => { mode === 'zoom' && vpRef.current && ( vpRef.current.scrollLeft -= e.shiftKey ? 160 : 40 ) },
    arrowright: e => { mode === 'zoom' && vpRef.current && ( vpRef.current.scrollLeft += e.shiftKey ? 160 : 40 ) }
  } );


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
              ref= { vpRef }
              onPointerDown= { handlePointerDown }
              onPointerMove= { handlePointerMove }
              onPointerUp= { handlePointerUp }
              onPointerCancel= { handlePointerCancel }
              onPointerLeave= { () => { if ( ! dragRef.current.active ) setPointer( null ) } }
              className= {
                `absolute inset-0 overflow-auto ${ mode === 'zoom' ? 'overscroll-none' : 'overscroll-auto' } ` +
                `${ magnifier ? 'cursor-none' : mode === 'zoom' ? dragging ? 'cursor-grabbing' : 'cursor-grab' : '' }`
              }
            >
              <div className= { mode === 'zoom' ? 'flex w-max min-w-full h-max min-h-full' : 'contents' }>
                <img
                  ref= { imageRef }
                  src= { imageUrl }
                  alt= { media.title || media.fileName }
                  width= { mode === 'zoom' ? Math.round( imageSize.width * zoom ) : undefined }
                  height= { mode === 'zoom' ? Math.round( imageSize.height * zoom ) : undefined }
                  onLoad= { e => {
                    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
                    setImageSize( { width, height } );
                    zoomRef.current = Math.min( vpRef.current!.clientWidth / width, vpRef.current!.clientHeight / height, 1 );
                    setZoom( zoomRef.current );
                  } }
                  draggable= { false }
                  className= { mode === 'zoom' ? 'shrink-0 block m-auto max-w-none' :
                    `absolute inset-0 w-full h-full ${ mode === 'fit' ? 'object-contain' : 'object-cover' }`
                  }
                />
              </div>
            </div>

            { magnifier > 0 && pointer && (
              <svg
                className= 'absolute inset-0 z-10 w-full h-full pointer-events-none'
                viewBox= { `0 0 ${ vpRef.current?.clientWidth || 1 } ${ vpRef.current?.clientHeight || 1 }` }
              >
                <defs>
                  <clipPath id= 'image-magnifier'>
                    <circle cx= { pointer.x } cy= { pointer.y } r= '120' />
                  </clipPath>
                </defs>

                <image
                  href= { imageUrl }
                  x= { pointer.x - ( pointer.x - pointer.left ) * magnifier }
                  y= { pointer.y - ( pointer.y - pointer.top ) * magnifier }
                  width= { pointer.width * magnifier }
                  height= { pointer.height * magnifier }
                  preserveAspectRatio= 'none'
                  clipPath= 'url(#image-magnifier)'
                />

                <circle
                  cx= { pointer.x } cy= { pointer.y } r= '120'
                  fill= 'none' stroke= 'white' strokeWidth= '2'
                />
              </svg>
            ) }

            <div
              className= {
                'absolute right-4 bottom-4 z-2 flex items-center gap-1 p-1 rounded-lg ' +
                'bg-slate-50/10 backdrop-blur'
              }
            >
              <button
                onClick= { () => setView( 'fit' ) }
                title= 'Fit to screen [0]'
                className= { BUTTON }
              >
                <Minimize2Icon size= { 18 } />
              </button>

              <button
                onClick= { () => setView( 'fill' ) }
                title= 'Fill screen [f]'
                className= { BUTTON }
              >
                <Maximize2Icon size= { 18 } />
              </button>

              <button
                onClick= { () => { zoomRef.current = 1, setZoom( 1 ), setView( 'zoom' ) } }
                title= 'Zoom to 100% (1:1) [1]'
                className= { BUTTON }
              >
                <ScanIcon size= { 18 } />
              </button>

              { mode === 'zoom' && (
                <>
                  <button
                    onClick= { () => changeZoom( 0.8 ) }
                    title= 'Zoom out [-]'
                    className= { BUTTON }
                  >
                    <ZoomOutIcon size= { 18 } />
                  </button>

                  <button
                    onClick= { () => changeZoom( 1.25 ) }
                    title= 'Zoom in [+]'
                    className= { BUTTON }
                  >
                    <ZoomInIcon size= { 18 } />
                  </button>
                </>
              ) }

              <button
                onClick= { toggleZoom }
                aria-pressed= { mode === 'zoom' }
                title= { mode === 'zoom' ? 'Exit zoom mode [z]' : 'Enter zoom mode [z]' }
                className= { BUTTON + ( mode === 'zoom' ? ' bg-slate-50/10' : '' ) }
              >
                <MoveIcon size= { 18 } />
              </button>

              <button
                onClick= { () => { setMagnifier( c => c ? 0 : 2 ), setPointer( null ) } }
                aria-pressed= { magnifier > 0 }
                title= { magnifier > 0 ? 'Disable magnifier [m]' : 'Enable magnifier [m]' }
                className= { BUTTON + ( magnifier ? ' bg-slate-50/10' : '' ) }
              >
                <ScanEyeIcon size= { 18 } />
              </button>

              <button
                onClick= { toggleFullscreen }
                aria-pressed= { fullscreen }
                title= 'Toggle fullscreen [F11]'
                className= { BUTTON + ( fullscreen ? ' bg-slate-50/10' : '' ) }
              >
                { fullscreen ? <ShrinkIcon size= { 18 } /> : <ExpandIcon size= { 18 } /> }
              </button>
            </div>
          </>
        ) }
      </div>

      <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
        <MediaActions media= { media } />

        { playlistId && (
          <ActivePlaylist
            playlistId= { playlistId }
            mediaId= { media.id }
            orientation= 'horizontal'
          />
        ) }

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
