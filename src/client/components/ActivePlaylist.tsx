import { MediaThumbnail } from '@/src/client/components/MediaThumbnail';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import type { MediaRecord } from '@/src/shared/types/media';
import { PauseIcon, PlayIcon, RepeatIcon, ShuffleIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';


interface ActivePlaylistProps {
  playlistId: string;
  mediaId: string;
  orientation?: 'horizontal' | 'vertical';
  ended?: boolean;
}

interface ActivePlaylistData {
  name: string;
  entries: MediaRecord[];
}

interface DragState {
  x: number;
  scrollLeft: number;
  moved: boolean;
}


const BUTTON = ( active = false ) =>
  'flex justify-center items-center size-10 rounded-full bg-slate-50/10 disabled:opacity-30 ' +
  'disabled:pointer-events-none ' + ( active ? 'bg-slate-50/40' : 'hover:bg-slate-50/20' );


export function ActivePlaylist ( { playlistId, mediaId, orientation = 'horizontal', ended = false }: ActivePlaylistProps ) {
  const { media, playlists, prefs } = useApi();
  const navigate = useNavigate();

  const [ autoplay, setAutoplay ] = useState( false );
  const [ repeat, setRepeat ] = useState( false );
  const [ shuffle, setShuffle ] = useState( false );

  const scrollRef = useRef< HTMLDivElement >( null );
  const drag = useRef< DragState | null >( null );
  const dragged = useRef( false );
  const endedRef = useRef( false );


  const { data } = useApiData< ActivePlaylistData >( playlistId, async () => {
    const [ playlist, items ] = await Promise.all( [
      playlists.get( playlistId ), playlists.items( playlistId, { limit: 1000, offset: 0 } )
    ] );

    const entries = await Promise.all( items.sort( ( a, b ) => a.position - b.position ).map( i => media.get( i.mediaId ) ) );
    return { name: playlist?.name ?? '', entries: entries.filter( ( i ): i is MediaRecord => !! i?.available ) };
  } );

  const entries = data?.entries ?? [];
  const index = entries.findIndex( e => e.id === mediaId );
  const horizontal = orientation === 'horizontal';


  useEffect( () => void Promise.all( [
    prefs.get( 'PLAYER_AUTOPLAY_NEXT' ), prefs.get( 'PLAYER_REPEAT' ), prefs.get( 'PLAYER_SHUFFLE' )
  ] ).then( ( [ a, r, s ] ) => {
    setAutoplay( a.value ), setRepeat( r.value ), setShuffle( s.value )
  } ), [ prefs ] );


  const open = useCallback( ( nextIndex: number ) => {
    const entry = entries[ nextIndex ];
    if ( entry ) navigate( `/watch/${ entry.id }/${ playlistId }` );
  }, [ entries, navigate, playlistId ] );

  const previous = useCallback( () => {
    if ( index > 0 ) open( index - 1 );
    else if ( repeat ) open( entries.length - 1 );
  }, [ entries.length, index, open, repeat ] );

  const next = useCallback( ( auto = false ) => {
    if ( index < 0 || ! entries.length ) return;
    if ( auto && ( ! autoplay || ! [ 'audio', 'video' ].includes( entries[ index ].type ) ) ) return;

    if ( shuffle && entries.length > 1 ) {
      const choices = entries.map( ( _, i ) => i ).filter( i => i !== index );
      open( choices[ Math.floor( Math.random() * choices.length ) ] );
    }

    else if ( index < entries.length - 1 ) open( index + 1 );
    else if ( repeat ) open( 0 );
  }, [ autoplay, entries, index, open, repeat, shuffle ] );


  const toggleAutoplay = () => { setAutoplay( ! autoplay ), prefs.set( 'PLAYER_AUTOPLAY_NEXT', ! autoplay ) };
  const toggleRepeat = () => { setRepeat( ! repeat ), prefs.set( 'PLAYER_REPEAT', ! repeat ) };
  const toggleShuffle = () => { setShuffle( ! shuffle ), prefs.set( 'PLAYER_SHUFFLE', ! shuffle ) };


  useEffect( () => {
    if ( ended && ! endedRef.current ) next( true );
    endedRef.current = ended;
  }, [ ended, next ] );

  useEffect( () => {
    const move = ( e: PointerEvent ) => {
      if ( ! drag.current || ! scrollRef.current ) return;

      const distance = e.clientX - drag.current.x;
      if ( Math.abs( distance ) > 4 ) drag.current.moved = true, dragged.current = true;
      if ( drag.current.moved ) scrollRef.current.scrollLeft = drag.current.scrollLeft - distance;
    };

    const stop = () => drag.current = null;

    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', stop );
    window.addEventListener( 'pointercancel', stop );

    return () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', stop );
      window.removeEventListener( 'pointercancel', stop );
    };
  }, [] );

  useEffect( () => {
    const keydown = ( e: KeyboardEvent ) => {
      if ( e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLElement && (
        [ 'INPUT', 'TEXTAREA', 'SELECT' ].includes( e.target.tagName ) || e.target.isContentEditable
      ) ) return;

      const p = e.preventDefault.bind( e );

      switch ( e.key.toLowerCase() ) {
        case 'p': p(), previous(); break;
        case 'n': p(), next(); break;
        case 'a': p(), toggleAutoplay(); break;
        case 's': p(), toggleShuffle(); break;
        case 'r': p(), toggleRepeat(); break;
      }
    };

    window.addEventListener( 'keydown', keydown );
    return () => window.removeEventListener( 'keydown', keydown );
  }, [ next, previous, autoplay, shuffle, repeat ] );


  if ( ! data || ! entries.length ) return null;

  return (
    <div className= 'flex flex-col gap-6 w-full max-w-full min-w-0 p-4 bg-slate-50/5 rounded shadow-lg'>
      <div className= 'flex justify-between items-center gap-4'>
        <Link
          to= { `/playlist/${ playlistId }` }
          className= 'min-w-0 truncate font-medium'
        >
          { data.name }
        </Link>

        <span className= 'shrink-0 text-sm tabular-nums text-slate-400'>
          { index + 1 } / { entries.length }
        </span>
      </div>

      <div className= 'flex justify-center items-center gap-3'>
        <button
          onClick= { previous }
          disabled= { index <= 0 && ! repeat }
          title= 'Previous [p]'
          className= { BUTTON() }
        >
          <SkipBackIcon size= { 18 } />
        </button>

        <button
          onClick= { toggleAutoplay }
          title= 'Autoplay [a]'
          aria-pressed= { autoplay }
          className= { BUTTON( autoplay ) }
        >
          { autoplay ? <PauseIcon size= { 18 } /> : <PlayIcon size= { 18 } /> }
        </button>

        <button
          onClick= { () => next() }
          disabled= { index === entries.length - 1 && ! repeat && ! shuffle }
          title= 'Next [n]'
          className= { BUTTON() }
        >
          <SkipForwardIcon size= { 18 } />
        </button>

        <button
          onClick= { toggleShuffle }
          title= 'Shuffle [s]'
          aria-pressed= { shuffle }
          className= { BUTTON( shuffle ) }
        >
          <ShuffleIcon size= { 18 } />
        </button>

        <button
          onClick= { toggleRepeat }
          title= 'Repeat [r]'
          aria-pressed= { repeat }
          className= { BUTTON( repeat ) }
        >
          <RepeatIcon size= { 18 } />
        </button>
      </div>

      <div
        ref= { scrollRef }
        className= { horizontal
          ? 'w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing'
          : 'flex flex-col gap-3 max-h-[min(60vh,32rem)] overflow-y-auto'
        }
        onPointerDown= { e => {
          if ( ! horizontal || e.pointerType !== 'mouse' || e.button !== 0 ) return;

          dragged.current = false;
          drag.current = { x: e.clientX, scrollLeft: e.currentTarget.scrollLeft, moved: false };
        } }
        onClickCapture= { e => {
          if ( ! dragged.current ) return;

          e.preventDefault(), e.stopPropagation();
          dragged.current = false;
        } }
      >
        <div className= { horizontal ? 'flex w-max min-w-full gap-2' : 'flex flex-col gap-1' }>
          { entries.map( ( entry, i ) => (
            <button
              key= { entry.id }
              onClick= { () => open( i ) }
              className= {
                'shrink-0 flex p-2 text-left rounded-lg transition-colors ' +
                ( horizontal ? 'flex-col gap-2 w-40 ' : 'items-center gap-4 w-full ' ) +
                ( i === index ? 'bg-slate-50/10' : 'hover:bg-slate-50/5' )
              }
            >
              <div className= { horizontal ? 'w-full' : 'shrink-0 w-24' }>
                <MediaThumbnail media= { entry } />
              </div>

              <span className= { horizontal ? 'w-full text-xs truncate' : 'flex-1 min-w-0 text-sm truncate' }>
                { entry.title || entry.fileName }
              </span>
            </button>
          ) ) }
        </div>
      </div>
    </div>
  );
}
