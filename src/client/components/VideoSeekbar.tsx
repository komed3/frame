import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { formatDuration } from '@/src/client/utils/format';
import type { MediaFrame, MediaFramesManifest } from '@/src/shared/types/assets';
import type { MarkerRecord } from '@/src/shared/types/markers';
import { useEffect, useRef, useState } from 'react';


interface VideoSeekbarProps {
  mediaId: string;
  currentTime: number;
  duration: number;
  buffered: { start: number, end: number }[];
  markers: MarkerRecord[];
  onSeek: ( time: number ) => void;
}


export function VideoSeekbar ( { mediaId, currentTime, duration, buffered, markers, onSeek }: VideoSeekbarProps ) {
  const { assets } = useApi();

  const rootRef = useRef< HTMLDivElement >( null );
  const inputRef = useRef< HTMLInputElement >( null );
  const previewRef = useRef< HTMLDivElement >( null );
  const previewFrameRef = useRef< number | null >( null );
  const imagesRef = useRef( new Map< string, HTMLImageElement >() );
  const trackRef = useRef< HTMLDivElement >( null );
  const thumbRef = useRef< HTMLDivElement >( null );
  const draggingRef = useRef( false );
  const pendingRef = useRef( currentTime );

  const [ hovering, setHovering ] = useState< number | null >( null );
  const [ previewPosition, setPreviewPosition ] = useState( { left: 0, top: 0 } );
  const [ previewSrc, setPreviewSrc ] = useState< string | null >( null );


  const { data: frames = [] } = useApiData< MediaFrame[] >( mediaId, async () =>
    ( await assets.load< MediaFramesManifest >( assets.url( mediaId, 'frames' ) ) )?.frames
  );

  const progress = duration > 0 ? currentTime / duration : 0;
  const hoverTime = hovering === null ? null : hovering * duration * 1000;
  const frame = hoverTime === null ? null : frames?.reduce< MediaFrame | null >(
    ( p, c ) => c.timeMs <= hoverTime && ( ! p || c.timeMs > p.timeMs ) ? c : p, null
  ) ?? frames?.[ 0 ] ?? null;
  const frameSrc = frame ? `/api/assets/${ encodeURIComponent( mediaId ) }/frame/${ frame.index }` : null;


  const update = ( time: number ) => {
    const pos = duration > 0 ? time / duration : 0;

    if ( trackRef.current ) {
      trackRef.current.style.left = `${ progress * 100 }%`;
      trackRef.current.style.width = `${ Math.max( 0, pos - progress ) * 100 }%`;
    }

    if ( thumbRef.current ) thumbRef.current.style.left = `${ pos * 100 }%`;
  };

  const commit = () => {
    if ( ! draggingRef.current && pendingRef.current === currentTime ) return;

    draggingRef.current = false;
    onSeek( pendingRef.current );
  };


  useEffect( () => {
    if ( draggingRef.current ) return;

    pendingRef.current = currentTime;
    if ( inputRef.current ) inputRef.current.value = String( currentTime );

    update( currentTime );
  }, [ currentTime, duration ] );

  useEffect( () => { imagesRef.current.clear(), setPreviewSrc( null ) }, [ mediaId ] );

  useEffect( () => {
    if ( ! frameSrc ) return;

    const cached = imagesRef.current.get( frameSrc );
    if ( cached ) { if ( cached.complete && cached.naturalWidth ) setPreviewSrc( frameSrc ); return }

    const image = new Image();
    imagesRef.current.set( frameSrc, image );
    image.onload = () => setPreviewSrc( frameSrc );
    image.onerror = () => imagesRef.current.delete( frameSrc );
    image.src = frameSrc;
  }, [ frameSrc ] );

  useEffect( () => {
    if ( hovering === null || ! rootRef.current || ! previewRef.current ) return;

    const updatePosition = () => {
      if ( previewFrameRef.current ) cancelAnimationFrame( previewFrameRef.current );

      previewFrameRef.current = requestAnimationFrame( () => {
        const root = rootRef.current, preview = previewRef.current;
        if ( ! root || ! preview ) return;

        const rect = root.getBoundingClientRect();
        const width = preview.offsetWidth, height = preview.offsetHeight, x = rect.left + hovering * rect.width;
        const left = Math.max( 8, Math.min( document.documentElement.clientWidth - width - 8, x - width / 2 ) );
        const top = rect.top - height - 16 >= 8 ? rect.top - height - 16 : Math.min(
          document.documentElement.clientHeight - height - 8, rect.bottom + 16
        );

        setPreviewPosition( { left: left - rect.left, top: top - rect.top } );
      } );
    };

    const observer = new ResizeObserver( updatePosition );
    observer.observe( rootRef.current );
    observer.observe( previewRef.current );
    window.addEventListener( 'resize', updatePosition );
    window.addEventListener( 'scroll', updatePosition, true );
    updatePosition();

    return () => {
      observer.disconnect();
      window.removeEventListener( 'resize', updatePosition );
      window.removeEventListener( 'scroll', updatePosition, true );
      if ( previewFrameRef.current ) cancelAnimationFrame( previewFrameRef.current );
    };
  }, [ hovering, frame ] );


  return (
    <div
      ref= { rootRef }
      className= 'relative flex items-center w-full h-1'
      onMouseMove= { e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHovering( Math.max( 0, Math.min( 1, ( e.clientX - rect.left ) / rect.width ) ) );
      } }
      onMouseLeave= { () => setHovering( null ) }
    >
      { hovering !== null && (
        <div
          ref= { previewRef }
          className= 'absolute z-20 pointer-events-none'
          style= { {
            left: previewPosition.left, top: previewPosition.top,
            width: 'min(160px, calc(100vw - 16px))'
          } }
        >
          { previewSrc && (
            <img
              src= { previewSrc }
              className= 'block w-full h-auto aspect-video object-contain bg-black rounded'
              alt= ''
            />
          ) }
          <div className= 'mt-1 text-center text-xs tabular-nums text-white'>
            { formatDuration( hoverTime ?? 0 ) }
          </div>
        </div>
      ) }

      <div className= 'absolute top-1/2 inset-x-0 -translate-y-1/2 h-full bg-slate-700'>
        { buffered.map( ( range, i ) => (
          <div
            key= { i }
            className= 'absolute top-0 h-full bg-slate-500'
            style= { {
              left: `${ range.start / duration * 100 }%`,
              width: `${ ( range.end - range.start ) / duration * 100 }%`
            } }
          />
        ) ) }

        <div ref= { trackRef } className= 'absolute top-0 h-full bg-white/40' />
      
        <div
          className= 'absolute top-0 left-0 h-full bg-sky-500'
          style= { { width: `${ progress * 100 }%` } }
        />
      </div>

      { duration > 0 && markers.map( ( { id, positionMs, title, description } ) => (
        <button
          key= { id }
          onClick= { e => { e.stopPropagation(), onSeek( positionMs / 1000 ) } }
          title= { `${ formatDuration( positionMs ) }${ title ? ` – ${ title }` : '' }` }
          aria-label= { `Seek to marker ${ title || formatDuration( positionMs ) }` }
          className= {
            'absolute top-1/2 -translate-1/2 z-20 flex justify-center items-center ' +
            'size-4 pointer-events-auto'
          }
          style= { { left: `${ positionMs / ( duration * 1000 ) * 100 }%` } }
        >
          <span className= 'block w-1 h-3 bg-amber-400 rounded-sm shadow' />
        </button>
      ) ) }

      <div
        ref= { thumbRef }
        className= {
          'absolute top-1/2 -translate-1/2 size-3 bg-white rounded-full ' +
          'shadow transition-opacity pointer-events-none'
        }
        style= { {
          left: `${ progress * 100 }%`,
          opacity: hovering !== null || draggingRef.current ? 1 : 0
        } }
      />

      <input
        ref= { inputRef }
        type= 'range'
        min= { 0 } max= { duration || 1 } step= { 0.01 } defaultValue= { currentTime }
        onPointerDown= { () => { draggingRef.current = true } }
        onInput= { e => {
          pendingRef.current = Number( e.currentTarget.value );
          update( pendingRef.current );
        } }
        onPointerUp= { commit }
        onPointerCancel= { commit }
        onKeyUp= { e => {
          pendingRef.current = Number( e.currentTarget.value );
          commit();
        } }
        onBlur= { commit }
        aria-label= 'Seek' title= 'Seek'
        className= {
          'appearance-none absolute inset-x-0 -inset-y-1 z-10 m-0 ' +
          'w-full h-2 bg-transparent opacity-0 cursor-pointer'
        }
      />
    </div>
  );
}
