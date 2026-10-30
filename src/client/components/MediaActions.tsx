import { Loading } from '@/src/client/components/Loading';
import { MediaMetadata } from '@/src/client/components/MediaMetadata';
import { MediaRating } from '@/src/client/components/MediaRating';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { useBodyScrollLock } from '@/src/client/hooks/useBodyScrollLock';
import type { MediaRecord } from '@/src/shared/types/media';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import type { PlaylistRecord } from '@/src/shared/types/playlists';
import {
  CheckIcon, DatabaseIcon, DownloadIcon, HeartIcon, ListVideoIcon, MoreHorizontalIcon,
  PlusIcon, RefreshCwIcon, SettingsIcon, XIcon
} from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { Link } from 'react-router';


interface MediaActionsProps {
  media: MediaRecord;
}


const BUTTON =
  'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
  'rounded-full transition-colors hover:bg-slate-50/20';

const CTX_BUTTON =
  'flex items-center gap-3 w-full px-6 py-2 tracking-wider transition-colors ' +
  'text-sm hover:bg-slate-50/10';


export function MediaActions ( { media }: MediaActionsProps ) {
  const { canEdit, favorites, media: mediaApi, jobs, playlists, stream } = useApi();
  const { data, loading } = useApiData< boolean >( media.id, () =>
    favorites.has( media.id ).then( res => res.favorite ).catch( () => false )
  );

  const [ favoriteOverride, setFavoriteOverride ] = useState< { id: string; value: boolean } | null >( null );
  const [ updating, setUpdating ] = useState( false );
  const [ menuOpen, setMenuOpen ] = useState( false );
  const [ metadataOpen, setMetadataOpen ] = useState( false );
  const [ metadata, setMetadata ] = useState< MediaMetadataRecord[] >( [] );
  const [ metadataLoading, setMetadataLoading ] = useState( false );
  const [ downloading, setDownloading ] = useState( false );
  const [ playlistOpen, setPlaylistOpen ] = useState( false );
  const [ playlistLoading, setPlaylistLoading ] = useState( false );
  const [ playlistItems, setPlaylistItems ] = useState< PlaylistRecord[] >( [] );
  const [ selectedPlaylists, setSelectedPlaylists ] = useState< string[] >( [] );
  const [ playlistName, setPlaylistName ] = useState( '' );
  const [ playlistCreating, setPlaylistCreating ] = useState( false );
  const [ playlistUpdating, setPlaylistUpdating ] = useState< string | null >( null );
  const [ playlistError, setPlaylistError ] = useState< string | null >( null );

  const favorite = favoriteOverride?.id === media.id ? favoriteOverride.value : data ?? false;

  useBodyScrollLock( menuOpen || metadataOpen || playlistOpen );


  const toggleFavorite = async () => {
    if ( updating || loading ) return;
    setUpdating( true );

    try {
      if ( favorite ) await favorites.remove( media.id );
      else await favorites.add( media.id );

      setFavoriteOverride( { id: media.id, value: ! favorite } );
    } finally {
      setUpdating( false );
    }
  };

  const showMetadata = async () => {
    setMenuOpen( false ), setMetadataOpen( true ), setMetadataLoading( true );

    try { setMetadata( await mediaApi.metadata( media.id ) ) }
    catch { setMetadata( [] ) }
    finally { setMetadataLoading( false ) }
  };

  const rescanMetadata = () => {
    setMenuOpen( false );
    jobs.enqueue( { kind: 'metadata', mediaId: media.id } ).catch( () => {} );
  };

  const downloadMedia = async () => {
    setMenuOpen( false ), setDownloading( true );

    try {
      const url = URL.createObjectURL( await ( await stream( media.id ) ).blob() );
      const link = document.createElement( 'a' );

      link.href = url;
      link.download = media.fileName;
      link.click();

      window.setTimeout( () => URL.revokeObjectURL( url ), 1000 );
    } finally {
      setDownloading( false );
    }
  };


  return (
    <>
      <div className= 'flex flex-wrap items-center gap-4'>
        { canEdit && (
          <Link
            to= { `/edit/${ media.id }` }
            className= { BUTTON }
          >
            <SettingsIcon size= { 16 } />
            <span>Edit</span>
          </Link>
        ) }

        <button
          aria-pressed= { favorite }
          disabled= { loading || updating }
          onClick= { toggleFavorite }
          className= { BUTTON }
        >
          <HeartIcon size= { 18 } fill= { favorite ? 'currentColor' : 'none' } />
          <span>{ favorite ? 'Favorite' : 'Add to favourites' }</span>
        </button>

        <button className= { BUTTON }>
          <ListVideoIcon size= { 18 } />
          <span>Playlists</span>
        </button>

        <div className= 'relative z-50'>
          <button
            aria-label= 'More actions'
            aria-expanded= { menuOpen }
            onClick= { () => setMenuOpen( ! menuOpen ) }
            className= { BUTTON + ' justify-center w-10! px-0!' }
          >
            <MoreHorizontalIcon size= { 18 } />
          </button>

          { menuOpen && (
            <div className= 'absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 shadow-lg'>
              <div className= 'absolute -top-1.5 left-1/2 -translate-x-1/2 rotate-45 size-3 bg-slate-700' />

              <div className= 'relative z-1 py-2 bg-slate-700 rounded'>
                <button onClick= { showMetadata } className= { CTX_BUTTON }>
                  <DatabaseIcon size= { 16 } />
                  <span>View metadata</span>
                </button>

                { canEdit && (
                  <button onClick= { rescanMetadata } className= { CTX_BUTTON }>
                    <RefreshCwIcon size= { 16 } />
                    <span>Rescan metadata</span>
                  </button>
                ) }

                <button
                  onClick= { downloadMedia }
                  disabled= { downloading }
                  className= { CTX_BUTTON }
                >
                  <DownloadIcon size= { 16 } />
                  <span>{ downloading ? 'Downloading …' : 'Download media' }</span>
                </button>
              </div>
            </div>
          ) }
        </div>

        <div className= 'flex-1' />

        <div className= 'flex items-center gap-4'>
          <span className= 'text-xs uppercase tracking-wider text-slate-400'>
            Rating
          </span>

          <MediaRating media= { media } />
        </div>
      </div>

      { ( menuOpen || metadataOpen ) && (
        <div
          onClick= { () => { setMenuOpen( false ), setMetadataOpen( false ) } }
          className= 'fixed inset-0 z-40 bg-slate-900 opacity-50'
        />
      ) }

      { metadataOpen && (
        <div
          className= {
            'fixed top-1/2 left-1/2 -translate-1/2 z-50 flex flex-col gap-4 w-[90%] max-w-3xl ' +
            'max-h-[70vh] p-5 bg-slate-700 rounded shadow-lg'
          }
        >
          <div className= 'shrink-0 flex justify-between items-center'>
            <h2 className= 'font-medium'>Metadata</h2>

            <button
              aria-label= 'Close metadata'
              onClick= { () => setMetadataOpen( false ) }
            >
              <XIcon size= { 20 } />
            </button>
          </div>

          <div className= 'flex-1 overflow-y-auto'>
            { metadataLoading
              ? <Loading className= 'min-h-16 h-full' />
              : <MediaMetadata items= { metadata } />
            }
          </div>
        </div>
      ) }
    </>
  );
}
