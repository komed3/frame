import { Loading } from '@/src/client/components/Loading';
import { MediaMetadata } from '@/src/client/components/MediaMetadata';
import { MediaRating } from '@/src/client/components/MediaRating';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import type { MediaRecord } from '@/src/shared/types/media';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import {
  DatabaseIcon, DownloadIcon, HeartIcon, ListVideoIcon, MoreHorizontalIcon,
  RefreshCwIcon, SettingsIcon, XIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';


interface MediaActionsProps {
  media: MediaRecord;
}


const BUTTON =
  'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
  'rounded-full transition duration-100 hover:bg-slate-50/20';


export function MediaActions ( { media }: MediaActionsProps ) {
  const { canEdit, favorites, media: mediaApi, jobs, stream } = useApi();
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

  const favorite = favoriteOverride?.id === media.id ? favoriteOverride.value : data ?? false;


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
    <div className= 'flex flex-wrap items-center gap-4'>
      { canEdit && (
        <Link
          to= { `/edit/${ media.id }` }
          className= {
            'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
            'rounded-full transition duration-100 hover:bg-slate-50/20'
          }
        >
          <SettingsIcon size= { 16 } />
          <span>Edit</span>
        </Link>
      ) }

      <button
        aria-pressed= { favorite }
        disabled= { loading || updating }
        onClick= { toggleFavorite }
        className= {
          'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
          'rounded-full transition duration-100 hover:bg-slate-50/20 disabled:opacity-50'
        }
      >
        <HeartIcon size= { 18 } fill= { favorite ? 'currentColor' : 'none' } />
        <span>{ favorite ? 'Favorite' : 'Add to favourites' }</span>
      </button>

      <button
        className= {
          'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
          'rounded-full transition duration-100 hover:bg-slate-50/20'
        }
      >
        <ListVideoIcon size= { 18 } />
        <span>Playlists</span>
      </button>

      <div className= 'flex-1' />

      <div className= 'flex items-center gap-4'>
        <span className= 'text-xs uppercase tracking-wider text-slate-400'>
          Rating
        </span>

        <MediaRating media= { media } />
      </div>
    </div>
  );
}
